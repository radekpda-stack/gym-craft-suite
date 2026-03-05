-- Step 1: Fix RLS policy to show NULL user_id transactions
DROP POLICY IF EXISTS "Users can view their own credit_transactions" ON credit_transactions;
CREATE POLICY "Users can view their own credit_transactions" 
  ON credit_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Step 3: Fix rpc_complete_training_session to include user_id in both INSERTs
CREATE OR REPLACE FUNCTION rpc_complete_training_session(
  p_session_id UUID,
  p_trainer_id UUID,
  p_payment_method TEXT,
  p_participants JSONB,
  p_idempotency_key TEXT,
  p_trainer_summary TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_key UUID;
  v_session_record RECORD;
  v_participant JSONB;
  v_client_id UUID;
  v_price_share NUMERIC;
  v_participant_payment_method TEXT;
  v_client_balance NUMERIC;
  v_budget_group_id UUID;
  v_group_balance NUMERIC;
  v_results JSONB := '[]'::JSONB;
  v_has_cash_payment BOOLEAN := FALSE;
  v_has_card_payment BOOLEAN := FALSE;
  v_has_transfer_payment BOOLEAN := FALSE;
  v_has_later_payment BOOLEAN := FALSE;
  v_final_status TEXT;
  v_final_payment_status TEXT;
  v_summary_json JSONB;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='credit_transactions' AND column_name='group_id'
  ) THEN
    RAISE EXCEPTION 'Schema mismatch: public.credit_transactions.group_id is missing (expected column)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='clients' AND column_name='credit_balance'
  ) THEN
    RAISE EXCEPTION 'Schema mismatch: public.clients.credit_balance is missing (expected column)';
  END IF;

  v_summary_json := NULL;
  IF p_trainer_summary IS NOT NULL AND length(trim(p_trainer_summary)) > 0 THEN
    BEGIN
      v_summary_json := p_trainer_summary::jsonb;
    EXCEPTION WHEN others THEN
      v_summary_json := NULL;
    END;
  END IF;

  SELECT id INTO v_existing_key
  FROM training_idempotency_keys
  WHERE idempotency_key = p_idempotency_key;

  IF v_existing_key IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Already processed',
      'idempotent', true
    );
  END IF;

  INSERT INTO training_idempotency_keys (idempotency_key, session_id, trainer_id)
  VALUES (p_idempotency_key, p_session_id, p_trainer_id);

  SELECT * INTO v_session_record
  FROM training_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF v_session_record IS NULL THEN
    RAISE EXCEPTION 'Training session not found';
  END IF;

  IF v_session_record.status = 'completed' THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Session already completed',
      'idempotent', true
    );
  END IF;

  FOR v_participant IN SELECT * FROM jsonb_array_elements(p_participants)
  LOOP
    v_client_id := (v_participant->>'client_id')::UUID;
    v_price_share := COALESCE((v_participant->>'price_share')::NUMERIC, 0);
    v_participant_payment_method := COALESCE(v_participant->>'payment_method', p_payment_method);

    IF v_participant_payment_method = 'cash' THEN
      v_has_cash_payment := TRUE;
    ELSIF v_participant_payment_method = 'card' THEN
      v_has_card_payment := TRUE;
    ELSIF v_participant_payment_method = 'bank_transfer' THEN
      v_has_transfer_payment := TRUE;
    ELSIF v_participant_payment_method = 'later' THEN
      v_has_later_payment := TRUE;
    END IF;

    IF v_participant_payment_method != 'credit' OR v_price_share <= 0 THEN
      v_results := v_results || jsonb_build_object(
        'client_id', v_client_id,
        'price_share', v_price_share,
        'payment_method', v_participant_payment_method,
        'deducted', false,
        'reason', CASE
          WHEN v_participant_payment_method != 'credit' THEN 'Payment method is ' || v_participant_payment_method
          ELSE 'No deduction needed'
        END
      );
      CONTINUE;
    END IF;

    SELECT cbm.group_id INTO v_budget_group_id
    FROM client_budget_members cbm
    WHERE cbm.client_id = v_client_id
    LIMIT 1;

    IF v_budget_group_id IS NOT NULL THEN
      SELECT shared_balance INTO v_group_balance
      FROM client_budget_groups
      WHERE id = v_budget_group_id
      FOR UPDATE;

      INSERT INTO credit_transactions (
        client_id,
        user_id,
        amount,
        type,
        payment_method,
        description,
        training_session_id,
        group_id,
        status
      ) VALUES (
        v_client_id,
        p_trainer_id,
        -v_price_share,
        'training',
        'credit',
        'Trénink (' || jsonb_array_length(p_participants) || ' ' ||
          CASE
            WHEN jsonb_array_length(p_participants) = 1 THEN 'osoba'
            WHEN jsonb_array_length(p_participants) BETWEEN 2 AND 4 THEN 'osoby'
            ELSE 'osob'
          END || ')',
        p_session_id,
        v_budget_group_id,
        'completed'
      );

      v_results := v_results || jsonb_build_object(
        'client_id', v_client_id,
        'price_share', v_price_share,
        'payment_method', 'credit',
        'deducted', true,
        'from_group', v_budget_group_id,
        'new_balance', (v_group_balance - v_price_share)
      );
    ELSE
      SELECT credit_balance INTO v_client_balance
      FROM clients
      WHERE id = v_client_id
      FOR UPDATE;

      INSERT INTO credit_transactions (
        client_id,
        user_id,
        amount,
        type,
        payment_method,
        description,
        training_session_id,
        status
      ) VALUES (
        v_client_id,
        p_trainer_id,
        -v_price_share,
        'training',
        'credit',
        'Trénink (' || jsonb_array_length(p_participants) || ' ' ||
          CASE
            WHEN jsonb_array_length(p_participants) = 1 THEN 'osoba'
            WHEN jsonb_array_length(p_participants) BETWEEN 2 AND 4 THEN 'osoby'
            ELSE 'osob'
          END || ')',
        p_session_id,
        'completed'
      );

      v_results := v_results || jsonb_build_object(
        'client_id', v_client_id,
        'price_share', v_price_share,
        'payment_method', 'credit',
        'deducted', true,
        'new_balance', (v_client_balance - v_price_share)
      );
    END IF;
  END LOOP;

  IF v_has_later_payment THEN
    v_final_payment_status := 'pending';
  ELSIF v_has_cash_payment OR v_has_card_payment OR v_has_transfer_payment THEN
    v_final_payment_status := 'pending';
  ELSE
    v_final_payment_status := 'paid_credit';
  END IF;

  v_final_status := 'completed';

  UPDATE training_sessions SET
    status = v_final_status,
    payment_status = v_final_payment_status,
    payment_method = p_payment_method,
    completed_at = NOW(),
    updated_at = NOW(),
    trainer_summary = p_trainer_summary,
    went_well = CASE WHEN v_summary_json IS NOT NULL THEN v_summary_json->>'went_well' ELSE NULL END,
    problems = CASE WHEN v_summary_json IS NOT NULL THEN v_summary_json->>'problems' ELSE NULL END,
    recommendations = CASE WHEN v_summary_json IS NOT NULL THEN v_summary_json->>'recommendations' ELSE NULL END,
    pain_notes = CASE WHEN v_summary_json IS NOT NULL THEN v_summary_json->>'pain' ELSE NULL END
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Training completed',
    'status', v_final_status,
    'payment_status', v_final_payment_status,
    'participants', v_results
  );
END;
$$