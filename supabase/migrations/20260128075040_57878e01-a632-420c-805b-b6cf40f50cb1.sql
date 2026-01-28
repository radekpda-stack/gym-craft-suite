-- Fix rpc_complete_training_session: training_sessions doesn't have trainer_summary column
-- Map p_trainer_summary JSON into existing columns (trainer_went_well, trainer_problems, trainer_recommendations, pain_reported, pain_notes)
CREATE OR REPLACE FUNCTION public.rpc_complete_training_session(
  p_session_id uuid,
  p_trainer_id uuid,
  p_idempotency_key text,
  p_payment_method text,
  p_total_price numeric,
  p_participants jsonb,
  p_trainer_summary text DEFAULT NULL::text,
  p_subjective_rating integer DEFAULT NULL::integer,
  p_notes text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  v_final_status TEXT;
  v_summary_json JSONB;
BEGIN
  -- Schema self-checks (fail fast with clear message)
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

  -- Parse trainer summary JSON (optional)
  v_summary_json := NULL;
  IF p_trainer_summary IS NOT NULL AND length(trim(p_trainer_summary)) > 0 THEN
    BEGIN
      v_summary_json := p_trainer_summary::jsonb;
    EXCEPTION WHEN others THEN
      -- Ignore invalid JSON to avoid blocking completion
      v_summary_json := NULL;
    END;
  END IF;

  -- Check idempotency key
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

  -- Insert idempotency key
  INSERT INTO training_idempotency_keys (idempotency_key, session_id, trainer_id)
  VALUES (p_idempotency_key, p_session_id, p_trainer_id);

  -- Lock and get session
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

  -- Process each participant
  FOR v_participant IN SELECT * FROM jsonb_array_elements(p_participants)
  LOOP
    v_client_id := (v_participant->>'client_id')::UUID;
    v_price_share := COALESCE((v_participant->>'price_share')::NUMERIC, 0);
    v_participant_payment_method := COALESCE(v_participant->>'payment_method', p_payment_method);

    IF v_participant_payment_method = 'cash' THEN
      v_has_cash_payment := TRUE;
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

    -- Get client's budget group (if any)
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
        amount,
        type,
        payment_method,
        description,
        training_session_id,
        group_id,
        status
      ) VALUES (
        v_client_id,
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
        amount,
        type,
        payment_method,
        description,
        training_session_id,
        status
      ) VALUES (
        v_client_id,
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

  v_final_status := CASE WHEN v_has_cash_payment THEN 'pending_payment' ELSE 'completed' END;

  UPDATE training_sessions
  SET
    status = v_final_status,
    payment_method = p_payment_method,
    final_price = p_total_price,
    subjective_rating = p_subjective_rating,
    notes = p_notes,
    -- Map structured summary fields if provided
    trainer_went_well = COALESCE(v_summary_json->>'trainer_went_well', trainer_went_well),
    trainer_problems = COALESCE(v_summary_json->>'trainer_problems', trainer_problems),
    trainer_recommendations = COALESCE(v_summary_json->>'trainer_recommendations', trainer_recommendations),
    pain_reported = COALESCE((v_summary_json->>'pain_reported')::boolean, pain_reported),
    pain_notes = COALESCE(v_summary_json->>'pain_notes', pain_notes),
    updated_at = now()
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Training session completed',
    'status', v_final_status,
    'results', v_results,
    'deductions', v_results
  );
END;
$function$;