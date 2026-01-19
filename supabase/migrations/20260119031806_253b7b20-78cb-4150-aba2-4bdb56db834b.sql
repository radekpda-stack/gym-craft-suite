-- Fix cash/card/bank completion payment statuses to support "čeká na hotovost" workflow
-- 1) Update RPC to never write legacy 'paid'
CREATE OR REPLACE FUNCTION public.rpc_complete_training_session(
  p_session_id uuid,
  p_trainer_id uuid,
  p_idempotency_key uuid,
  p_payment_method text,
  p_total_price numeric,
  p_participants jsonb,
  p_trainer_summary jsonb DEFAULT NULL::jsonb,
  p_subjective_rating integer DEFAULT NULL::integer,
  p_notes text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_session RECORD;
  v_existing_completion UUID;
  v_participant JSONB;
  v_client_id UUID;
  v_price_share NUMERIC;
  v_group_id UUID;
  v_new_balance NUMERIC;
  v_results JSONB := '[]'::JSONB;
  v_participant_count INTEGER;
BEGIN
  -- Check idempotency - return early if already processed
  SELECT id INTO v_existing_completion
  FROM session_completion_log
  WHERE idempotency_key = p_idempotency_key;
  
  IF v_existing_completion IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent', true,
      'message', 'Session already completed'
    );
  END IF;

  -- Lock and fetch session
  SELECT * INTO v_session
  FROM training_sessions
  WHERE id = p_session_id
  FOR UPDATE;
  
  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not found');
  END IF;
  
  IF v_session.status = 'completed' THEN
    RETURN jsonb_build_object(
      'success', true, 
      'idempotent', true,
      'message', 'Session already completed'
    );
  END IF;

  -- Validate payment_method
  IF p_payment_method NOT IN ('credit', 'cash', 'card', 'bank', 'pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid payment method');
  END IF;

  -- Count and validate participants
  v_participant_count := jsonb_array_length(p_participants);
  IF v_participant_count < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'At least one participant required');
  END IF;

  -- Process each participant
  FOR v_participant IN SELECT * FROM jsonb_array_elements(p_participants)
  LOOP
    v_client_id := (v_participant->>'client_id')::UUID;
    v_price_share := COALESCE((v_participant->>'price_share')::NUMERIC, 0);
    
    -- Skip if no price to deduct or not credit payment
    IF p_payment_method != 'credit' OR v_price_share <= 0 THEN
      v_results := v_results || jsonb_build_object(
        'client_id', v_client_id,
        'price_share', v_price_share,
        'deducted', false,
        'reason', 'No deduction needed'
      );
      CONTINUE;
    END IF;

    -- Get budget group for client
    SELECT group_id INTO v_group_id
    FROM client_budget_members
    WHERE client_id = v_client_id;

    -- Create credit transaction (with unique constraint protection)
    BEGIN
      INSERT INTO credit_transactions (
        client_id, amount, type, description, 
        training_session_id, user_id, group_id, status
      ) VALUES (
        v_client_id, -v_price_share, 'training',
        'Trénink (' || v_participant_count || ' ' || 
        CASE WHEN v_participant_count = 1 THEN 'osoba' 
             WHEN v_participant_count < 5 THEN 'osoby' 
             ELSE 'osob' END || ')',
        p_session_id, p_trainer_id, v_group_id, 'completed'
      );
    EXCEPTION WHEN unique_violation THEN
      -- Transaction already exists - idempotent, continue
      v_results := v_results || jsonb_build_object(
        'client_id', v_client_id,
        'price_share', v_price_share,
        'deducted', false,
        'reason', 'Already deducted (idempotent)'
      );
      CONTINUE;
    END;

    -- Apply credit delta atomically
    IF v_group_id IS NOT NULL THEN
      UPDATE client_budget_groups
      SET shared_balance = COALESCE(shared_balance, 0) - v_price_share,
          updated_at = now()
      WHERE id = v_group_id
      RETURNING shared_balance INTO v_new_balance;
    ELSE
      UPDATE clients
      SET credit_balance = COALESCE(credit_balance, 0) - v_price_share,
          updated_at = now()
      WHERE id = v_client_id
      RETURNING credit_balance INTO v_new_balance;
    END IF;

    v_results := v_results || jsonb_build_object(
      'client_id', v_client_id,
      'price_share', v_price_share,
      'deducted', true,
      'new_balance', v_new_balance,
      'group_id', v_group_id
    );
  END LOOP;

  -- Update training session
  UPDATE training_sessions
  SET status = 'completed',
      participant_count = v_participant_count,
      final_price = p_total_price,
      payment_method = p_payment_method,
      payment_status = CASE 
        WHEN p_payment_method = 'credit' THEN 'paid_credit'
        WHEN p_payment_method = 'cash' THEN 'pending'           -- cash must be confirmed later
        WHEN p_payment_method = 'card' THEN 'paid_card'
        WHEN p_payment_method = 'bank' THEN 'paid_bank'
        WHEN p_payment_method = 'pending' THEN 'pending'
        ELSE 'pending'
      END,
      subjective_rating = COALESCE(p_subjective_rating, subjective_rating),
      notes = COALESCE(p_notes, notes),
      trainer_went_well = COALESCE(p_trainer_summary->>'trainer_went_well', trainer_went_well),
      trainer_problems = COALESCE(p_trainer_summary->>'trainer_problems', trainer_problems),
      trainer_recommendations = COALESCE(p_trainer_summary->>'trainer_recommendations', trainer_recommendations),
      pain_reported = COALESCE((p_trainer_summary->>'pain_reported')::BOOLEAN, pain_reported),
      pain_notes = COALESCE(p_trainer_summary->>'pain_notes', pain_notes),
      updated_at = now()
  WHERE id = p_session_id;

  -- Save participants
  DELETE FROM training_participants WHERE training_session_id = p_session_id;
  
  FOR v_participant IN SELECT * FROM jsonb_array_elements(p_participants)
  LOOP
    INSERT INTO training_participants (
      training_session_id, client_id, price_share, user_id
    ) VALUES (
      p_session_id,
      (v_participant->>'client_id')::UUID,
      COALESCE((v_participant->>'price_share')::NUMERIC, 0),
      p_trainer_id
    );
  END LOOP;

  -- Create completion log (audit trail)
  INSERT INTO session_completion_log (
    training_session_id, trainer_id, idempotency_key,
    participant_count, total_price, payment_method,
    participants, status
  ) VALUES (
    p_session_id, p_trainer_id, p_idempotency_key,
    v_participant_count, p_total_price, p_payment_method,
    v_results, 'success'
  );

  RETURN jsonb_build_object(
    'success', true,
    'idempotent', false,
    'session_id', p_session_id,
    'participant_count', v_participant_count,
    'total_price', p_total_price,
    'deductions', v_results
  );

EXCEPTION WHEN OTHERS THEN
  -- Log error
  INSERT INTO app_errors (
    error_type, message, endpoint, session_id, 
    user_id, payload_json
  ) VALUES (
    'rpc_complete_training_session', SQLERRM, 
    'rpc_complete_training_session', p_session_id,
    p_trainer_id, jsonb_build_object(
      'participants', p_participants,
      'payment_method', p_payment_method
    )
  );
  
  RETURN jsonb_build_object(
    'success', false, 
    'error', SQLERRM,
    'session_id', p_session_id
  );
END;
$function$;

-- 2) Migrate existing legacy 'paid' rows to the new explicit scheme
UPDATE public.training_sessions
SET payment_status = CASE
  WHEN payment_method = 'credit' THEN 'paid_credit'
  WHEN payment_method = 'cash' THEN 'pending'     -- treat legacy cash as awaiting confirmation
  WHEN payment_method = 'card' THEN 'paid_card'
  WHEN payment_method = 'bank' THEN 'paid_bank'
  ELSE 'pending'
END
WHERE payment_status = 'paid';
