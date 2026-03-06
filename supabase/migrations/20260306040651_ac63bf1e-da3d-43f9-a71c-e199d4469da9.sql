-- Fix security definer views to use security_invoker
ALTER VIEW vw_client_ledger_balances SET (security_invoker = true);
ALTER VIEW vw_group_ledger_balances SET (security_invoker = true);

-- ============================================================
-- Update rpc_complete_training_session with group dedup + all-event recording
-- ============================================================
CREATE OR REPLACE FUNCTION public.rpc_complete_training_session(
  p_session_id UUID, p_trainer_id UUID, p_payment_method TEXT,
  p_participants JSONB, p_idempotency_key TEXT,
  p_trainer_summary TEXT DEFAULT NULL, p_total_price NUMERIC DEFAULT NULL,
  p_subjective_rating INTEGER DEFAULT NULL, p_notes TEXT DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_existing_key UUID; v_session_record RECORD;
  v_participant JSONB; v_client_id UUID;
  v_price_share NUMERIC; v_participant_payment_method TEXT;
  v_budget_group_id UUID; v_results JSONB := '[]'::JSONB;
  v_has_cash_payment BOOLEAN := FALSE; v_has_card_payment BOOLEAN := FALSE;
  v_has_transfer_payment BOOLEAN := FALSE; v_has_later_payment BOOLEAN := FALSE;
  v_final_payment_status TEXT; v_summary_json JSONB;
  v_current_balance NUMERIC; v_new_balance NUMERIC;
  v_deducted_groups UUID[];
BEGIN
  v_summary_json := NULL;
  IF p_trainer_summary IS NOT NULL AND length(trim(p_trainer_summary)) > 0 THEN
    BEGIN v_summary_json := p_trainer_summary::jsonb;
    EXCEPTION WHEN others THEN v_summary_json := NULL; END;
  END IF;

  SELECT id INTO v_existing_key FROM training_idempotency_keys WHERE idempotency_key = p_idempotency_key;
  IF v_existing_key IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already processed', 'idempotent', true);
  END IF;
  INSERT INTO training_idempotency_keys (idempotency_key, session_id, trainer_id)
  VALUES (p_idempotency_key, p_session_id, p_trainer_id);

  SELECT * INTO v_session_record FROM training_sessions WHERE id = p_session_id FOR UPDATE;
  IF v_session_record IS NULL THEN RAISE EXCEPTION 'Training session not found'; END IF;
  IF v_session_record.status = 'completed' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Session already completed', 'idempotent', true);
  END IF;

  v_deducted_groups := ARRAY[]::UUID[];

  FOR v_participant IN SELECT * FROM jsonb_array_elements(p_participants)
  LOOP
    v_client_id := (v_participant->>'client_id')::UUID;
    v_price_share := COALESCE((v_participant->>'price_share')::NUMERIC, 0);
    v_participant_payment_method := COALESCE(v_participant->>'payment_method', p_payment_method);

    IF v_participant_payment_method = 'cash' THEN v_has_cash_payment := TRUE;
    ELSIF v_participant_payment_method = 'card' THEN v_has_card_payment := TRUE;
    ELSIF v_participant_payment_method = 'bank_transfer' THEN v_has_transfer_payment := TRUE;
    ELSIF v_participant_payment_method = 'later' THEN v_has_later_payment := TRUE;
    END IF;

    IF v_price_share <= 0 THEN
      v_results := v_results || jsonb_build_object('client_id', v_client_id, 'price_share', v_price_share, 'payment_method', v_participant_payment_method, 'deducted', false, 'reason', 'No deduction needed');
      CONTINUE;
    END IF;

    IF v_participant_payment_method = 'later' THEN
      v_results := v_results || jsonb_build_object('client_id', v_client_id, 'price_share', v_price_share, 'payment_method', 'later', 'deducted', false, 'reason', 'Payment deferred');
      CONTINUE;
    END IF;

    SELECT cbm.group_id INTO v_budget_group_id FROM client_budget_members cbm WHERE cbm.client_id = v_client_id LIMIT 1;

    IF v_budget_group_id IS NOT NULL AND v_participant_payment_method = 'credit' THEN
      IF v_budget_group_id = ANY(v_deducted_groups) THEN
        v_results := v_results || jsonb_build_object('client_id', v_client_id, 'price_share', v_price_share, 'payment_method', 'credit', 'deducted', false, 'reason', 'Group budget already deducted', 'group_id', v_budget_group_id);
        CONTINUE;
      END IF;
      SELECT shared_balance INTO v_current_balance FROM client_budget_groups WHERE id = v_budget_group_id FOR UPDATE;
      INSERT INTO credit_transactions (client_id, user_id, amount, type, payment_method, description, training_session_id, group_id, status)
      VALUES (v_client_id, p_trainer_id, -v_price_share, 'training', 'credit',
        'Trénink (' || jsonb_array_length(p_participants) || ' ' || CASE WHEN jsonb_array_length(p_participants) = 1 THEN 'osoba' WHEN jsonb_array_length(p_participants) BETWEEN 2 AND 4 THEN 'osoby' ELSE 'osob' END || ')',
        p_session_id, v_budget_group_id, 'completed');
      v_deducted_groups := array_append(v_deducted_groups, v_budget_group_id);
      v_results := v_results || jsonb_build_object('client_id', v_client_id, 'price_share', v_price_share, 'payment_method', 'credit', 'deducted', true, 'from_group', v_budget_group_id);
    ELSIF v_participant_payment_method = 'credit' THEN
      SELECT credit_balance INTO v_current_balance FROM clients WHERE id = v_client_id FOR UPDATE;
      INSERT INTO credit_transactions (client_id, user_id, amount, type, payment_method, description, training_session_id, status)
      VALUES (v_client_id, p_trainer_id, -v_price_share, 'training', 'credit',
        'Trénink (' || jsonb_array_length(p_participants) || ' ' || CASE WHEN jsonb_array_length(p_participants) = 1 THEN 'osoba' WHEN jsonb_array_length(p_participants) BETWEEN 2 AND 4 THEN 'osoby' ELSE 'osob' END || ')',
        p_session_id, 'completed');
      v_results := v_results || jsonb_build_object('client_id', v_client_id, 'price_share', v_price_share, 'payment_method', 'credit', 'deducted', true);
    ELSE
      -- Non-credit: record in ledger with amount=0 for audit trail
      INSERT INTO credit_transactions (client_id, user_id, amount, type, payment_method, description, training_session_id, status, group_id)
      VALUES (v_client_id, p_trainer_id, 0, 'training', v_participant_payment_method,
        'Trénink - platba ' || v_participant_payment_method || ' (' || v_price_share || ' Kč)',
        p_session_id, 'completed', v_budget_group_id);
      v_results := v_results || jsonb_build_object('client_id', v_client_id, 'price_share', v_price_share, 'payment_method', v_participant_payment_method, 'deducted', false, 'reason', 'Non-credit payment recorded');
    END IF;
  END LOOP;

  IF v_has_later_payment THEN v_final_payment_status := 'pending';
  ELSIF v_has_cash_payment OR v_has_card_payment OR v_has_transfer_payment THEN v_final_payment_status := 'pending';
  ELSE v_final_payment_status := 'paid_credit'; END IF;

  UPDATE training_sessions SET
    status = 'completed', payment_status = v_final_payment_status, payment_method = p_payment_method,
    final_price = COALESCE(p_total_price, v_session_record.final_price),
    completed_at = NOW(), updated_at = NOW(),
    subjective_rating = COALESCE(p_subjective_rating, v_session_record.subjective_rating),
    notes = COALESCE(p_notes, v_session_record.notes),
    trainer_summary = p_trainer_summary,
    went_well = CASE WHEN v_summary_json IS NOT NULL THEN v_summary_json->>'went_well' ELSE NULL END,
    problems = CASE WHEN v_summary_json IS NOT NULL THEN v_summary_json->>'problems' ELSE NULL END,
    recommendations = CASE WHEN v_summary_json IS NOT NULL THEN v_summary_json->>'recommendations' ELSE NULL END,
    pain_notes = CASE WHEN v_summary_json IS NOT NULL THEN v_summary_json->>'pain' ELSE NULL END
  WHERE id = p_session_id;

  RETURN jsonb_build_object('success', true, 'message', 'Training completed', 'session_id', p_session_id,
    'status', 'completed', 'payment_status', v_final_payment_status,
    'participant_count', jsonb_array_length(p_participants), 'total_price', p_total_price, 'deductions', v_results);
END; $$;

-- ============================================================
-- Update rpc_credit_add with row locking
-- ============================================================
CREATE OR REPLACE FUNCTION public.rpc_credit_add(
  p_client_id UUID, p_amount NUMERIC, p_payment_method TEXT DEFAULT 'cash',
  p_description TEXT DEFAULT NULL, p_idempotency_key TEXT DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID; v_group_id UUID; v_previous_balance NUMERIC;
  v_new_balance NUMERIC; v_tx_id UUID; v_entity_type TEXT;
  v_entity_id UUID; v_entity_name TEXT;
BEGIN
  IF p_amount <= 0 THEN RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive'); END IF;
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_tx_id FROM credit_transactions WHERE idempotency_key = p_idempotency_key;
    IF v_tx_id IS NOT NULL THEN RETURN jsonb_build_object('success', true, 'transaction_id', v_tx_id, 'message', 'Duplicate request', 'duplicate', true); END IF;
  END IF;
  v_user_id := auth.uid();
  SELECT cbm.group_id, cbg.name INTO v_group_id, v_entity_name
  FROM client_budget_members cbm JOIN client_budget_groups cbg ON cbg.id = cbm.group_id
  WHERE cbm.client_id = p_client_id;
  IF v_group_id IS NOT NULL THEN
    v_entity_type := 'group'; v_entity_id := v_group_id;
    SELECT shared_balance INTO v_previous_balance FROM client_budget_groups WHERE id = v_group_id FOR UPDATE;
  ELSE
    v_entity_type := 'client'; v_entity_id := p_client_id;
    SELECT name INTO v_entity_name FROM clients WHERE id = p_client_id;
    SELECT credit_balance INTO v_previous_balance FROM clients WHERE id = p_client_id FOR UPDATE;
  END IF;
  v_previous_balance := COALESCE(v_previous_balance, 0);
  v_new_balance := v_previous_balance + p_amount;
  INSERT INTO credit_transactions (client_id, amount, type, description, payment_method, user_id, group_id, status, source_type, balance_after, idempotency_key)
  VALUES (p_client_id, p_amount, 'payment', COALESCE(p_description, 'Dobití kreditu'), p_payment_method, v_user_id, v_group_id, 'completed', 'admin_panel', v_new_balance, p_idempotency_key)
  RETURNING id INTO v_tx_id;
  RETURN jsonb_build_object('success', true, 'transaction_id', v_tx_id,
    'balance', jsonb_build_object('entity_type', v_entity_type, 'entity_id', v_entity_id, 'entity_name', v_entity_name, 'new_balance', v_new_balance, 'previous_balance', v_previous_balance, 'delta', p_amount),
    'message', format('Kredit navýšen o %s Kč', p_amount), 'timestamp', now());
END; $$;

-- ============================================================
-- Update rpc_credit_deduct with row locking
-- ============================================================
CREATE OR REPLACE FUNCTION public.rpc_credit_deduct(
  p_client_id UUID, p_amount NUMERIC, p_source_type TEXT,
  p_source_id UUID DEFAULT NULL, p_description TEXT DEFAULT NULL, p_idempotency_key TEXT DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_transaction_id UUID; v_group_id UUID; v_current_balance NUMERIC;
  v_new_balance NUMERIC; v_client_name TEXT; v_max_debt NUMERIC := -10000;
BEGIN
  IF p_amount <= 0 THEN RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive'); END IF;
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_transaction_id FROM credit_transactions WHERE idempotency_key = p_idempotency_key;
    IF v_transaction_id IS NOT NULL THEN
      SELECT balance_after INTO v_new_balance FROM credit_transactions WHERE id = v_transaction_id;
      RETURN jsonb_build_object('success', true, 'transaction_id', v_transaction_id,
        'balance', jsonb_build_object('new_balance', v_new_balance, 'delta', -p_amount),
        'message', 'Transaction already processed (idempotent)', 'idempotent', true);
    END IF;
  END IF;
  SELECT name INTO v_client_name FROM clients WHERE id = p_client_id;
  SELECT group_id INTO v_group_id FROM client_budget_members WHERE client_id = p_client_id;
  IF v_group_id IS NOT NULL THEN
    SELECT shared_balance INTO v_current_balance FROM client_budget_groups WHERE id = v_group_id FOR UPDATE;
  ELSE
    SELECT credit_balance INTO v_current_balance FROM clients WHERE id = p_client_id FOR UPDATE;
  END IF;
  v_current_balance := COALESCE(v_current_balance, 0);
  v_new_balance := v_current_balance - p_amount;
  IF v_new_balance < v_max_debt THEN
    RETURN jsonb_build_object('success', false, 'error', format('Překročen maximální povolený dluh (%s Kč)', v_max_debt), 'current_balance', v_current_balance, 'requested_amount', p_amount, 'would_result_in', v_new_balance, 'max_debt', v_max_debt);
  END IF;
  INSERT INTO credit_transactions (client_id, group_id, amount, type, description, status, source_type, source_id, balance_after, idempotency_key)
  VALUES (p_client_id, v_group_id, -p_amount, 'deduct', COALESCE(p_description, 'Odečtení kreditu'), 'completed', p_source_type, p_source_id, v_new_balance, p_idempotency_key)
  RETURNING id INTO v_transaction_id;
  RETURN jsonb_build_object('success', true, 'transaction_id', v_transaction_id,
    'balance', jsonb_build_object('entity_type', CASE WHEN v_group_id IS NOT NULL THEN 'group' ELSE 'client' END, 'entity_id', COALESCE(v_group_id, p_client_id), 'entity_name', v_client_name, 'new_balance', v_new_balance, 'delta', -p_amount),
    'message', format('Odečteno %s Kč z účtu %s', p_amount, v_client_name), 'timestamp', now());
END; $$;