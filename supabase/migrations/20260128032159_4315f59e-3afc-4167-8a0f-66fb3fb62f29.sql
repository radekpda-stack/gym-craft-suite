-- Fix: RPC should check individual participant payment_method, not global p_payment_method
-- This fixes the bug where cash-paying participants in group trainings incorrectly had credit deducted

CREATE OR REPLACE FUNCTION public.rpc_complete_training_session(
  p_session_id UUID,
  p_trainer_id UUID,
  p_idempotency_key TEXT,
  p_payment_method TEXT,
  p_total_price NUMERIC,
  p_participants JSONB,
  p_trainer_summary TEXT DEFAULT NULL,
  p_subjective_rating INTEGER DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
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
  v_final_status TEXT;
BEGIN
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
    -- FIX: Get individual payment method from participant, not global parameter
    v_participant_payment_method := COALESCE(v_participant->>'payment_method', p_payment_method);
    
    -- Track if any participant pays cash for session status
    IF v_participant_payment_method = 'cash' THEN
      v_has_cash_payment := TRUE;
    END IF;
    
    -- Skip credit deduction if participant doesn't pay with credit or no price to deduct
    -- FIX: Check individual payment method, not global p_payment_method
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
    SELECT cbgm.group_id INTO v_budget_group_id
    FROM client_budget_group_members cbgm
    WHERE cbgm.client_id = v_client_id
    LIMIT 1;
    
    IF v_budget_group_id IS NOT NULL THEN
      -- Client is in a shared budget group - deduct from group balance
      SELECT shared_balance INTO v_group_balance
      FROM client_budget_groups
      WHERE id = v_budget_group_id
      FOR UPDATE;
      
      -- Create transaction for the group
      INSERT INTO credit_transactions (
        client_id,
        amount,
        type,
        payment_method,
        description,
        training_session_id,
        budget_group_id,
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
        'previous_balance', v_group_balance
      );
    ELSE
      -- Individual client - deduct from their balance
      SELECT credit_balance INTO v_client_balance
      FROM clients
      WHERE id = v_client_id
      FOR UPDATE;
      
      -- Create transaction
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
        'previous_balance', v_client_balance
      );
    END IF;
  END LOOP;
  
  -- Determine final session status
  -- If any participant paid cash, status should be 'pending' to require confirmation
  v_final_status := CASE WHEN v_has_cash_payment THEN 'pending' ELSE 'completed' END;
  
  -- Update session
  UPDATE training_sessions
  SET 
    status = v_final_status,
    payment_method = p_payment_method,
    payment_status = CASE WHEN v_has_cash_payment THEN 'pending' ELSE 'paid' END,
    price = p_total_price,
    trainer_summary = COALESCE(p_trainer_summary, trainer_summary),
    subjective_rating = COALESCE(p_subjective_rating, subjective_rating),
    notes = COALESCE(p_notes, notes),
    updated_at = NOW()
  WHERE id = p_session_id;
  
  -- Link participants to session
  INSERT INTO training_session_participants (training_session_id, client_id)
  SELECT p_session_id, (elem->>'client_id')::UUID
  FROM jsonb_array_elements(p_participants) AS elem
  ON CONFLICT (training_session_id, client_id) DO NOTHING;
  
  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'status', v_final_status,
    'payment_status', CASE WHEN v_has_cash_payment THEN 'pending' ELSE 'paid' END,
    'participants', v_results
  );
END;
$$;