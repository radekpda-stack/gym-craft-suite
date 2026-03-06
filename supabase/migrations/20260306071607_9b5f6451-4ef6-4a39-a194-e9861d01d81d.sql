
-- Drop all overloaded versions
DROP FUNCTION IF EXISTS public.rpc_complete_training_session(uuid, uuid, text, jsonb, text, text);
DROP FUNCTION IF EXISTS public.rpc_complete_training_session(uuid, uuid, text, text, numeric, jsonb, text, integer, text);
DROP FUNCTION IF EXISTS public.rpc_complete_training_session(uuid, uuid, text, jsonb, text, text, numeric, integer, text);

-- Recreate the single canonical version
CREATE OR REPLACE FUNCTION public.rpc_complete_training_session(
  p_session_id uuid,
  p_trainer_id uuid,
  p_idempotency_key text,
  p_payment_method text,
  p_total_price numeric DEFAULT NULL,
  p_participants jsonb DEFAULT '[]'::jsonb,
  p_trainer_summary text DEFAULT NULL,
  p_subjective_rating integer DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_participant RECORD;
  v_price_per_person numeric;
  v_participant_count int;
  v_deducted_groups uuid[] := ARRAY[]::uuid[];
  v_budget_group_id uuid;
  v_current_balance numeric;
  v_result jsonb;
  v_existing RECORD;
BEGIN
  -- Idempotency check
  SELECT id, status INTO v_existing
  FROM training_sessions
  WHERE id = p_session_id;

  IF v_existing.status = 'completed' THEN
    RETURN jsonb_build_object('status', 'already_completed', 'session_id', p_session_id);
  END IF;

  -- Lock the session row
  SELECT * INTO v_session
  FROM training_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found: %', p_session_id;
  END IF;

  -- Calculate participant count and price per person
  v_participant_count := GREATEST(jsonb_array_length(p_participants), 1);
  v_price_per_person := COALESCE(p_total_price, v_session.final_price, 0) / v_participant_count;

  -- Update session
  UPDATE training_sessions SET
    status = 'completed',
    payment_method = p_payment_method,
    final_price = COALESCE(p_total_price, v_session.final_price),
    participant_count = v_participant_count,
    trainer_summary = COALESCE(p_trainer_summary, trainer_summary),
    subjective_rating = COALESCE(p_subjective_rating, subjective_rating),
    notes = COALESCE(p_notes, notes),
    payment_status = CASE 
      WHEN p_payment_method = 'credit' THEN 'paid_credit'
      ELSE 'pending'
    END,
    updated_at = now()
  WHERE id = p_session_id;

  -- Process each participant
  FOR v_participant IN SELECT * FROM jsonb_to_recordset(p_participants) AS x(
    client_id uuid,
    payment_method text,
    price numeric
  )
  LOOP
    DECLARE
      v_p_method text := COALESCE(v_participant.payment_method, p_payment_method);
      v_p_price numeric := COALESCE(v_participant.price, v_price_per_person);
    BEGIN
      -- Check if participant belongs to a budget group
      SELECT group_id INTO v_budget_group_id
      FROM client_budget_members
      WHERE client_id = v_participant.client_id
      LIMIT 1;

      IF v_p_method = 'credit' AND v_p_price > 0 THEN
        IF v_budget_group_id IS NOT NULL THEN
          -- Group budget deduction - deduplicate
          IF v_budget_group_id = ANY(v_deducted_groups) THEN
            NULL;
          ELSE
            UPDATE client_budget_groups
            SET shared_balance = shared_balance - v_p_price,
                updated_at = now()
            WHERE id = v_budget_group_id;

            INSERT INTO credit_transactions (
              client_id, group_id, amount, type, description,
              source_type, source_id, payment_method, created_by
            ) VALUES (
              v_participant.client_id, v_budget_group_id, -v_p_price, 'training',
              'Trénink - skupinový rozpočet',
              'training_session', p_session_id, 'credit', p_trainer_id
            );

            v_deducted_groups := array_append(v_deducted_groups, v_budget_group_id);
          END IF;
        ELSE
          PERFORM id FROM clients WHERE id = v_participant.client_id FOR UPDATE;

          INSERT INTO credit_transactions (
            client_id, amount, type, description,
            source_type, source_id, payment_method, created_by
          ) VALUES (
            v_participant.client_id, -v_p_price, 'training',
            'Trénink - kredit',
            'training_session', p_session_id, 'credit', p_trainer_id
          );
        END IF;
      ELSIF v_p_price > 0 THEN
        INSERT INTO credit_transactions (
          client_id, amount, type, description,
          source_type, source_id, payment_method, created_by
        ) VALUES (
          v_participant.client_id, 0, 'training',
          'Trénink - ' || v_p_method,
          'training_session', p_session_id, v_p_method, p_trainer_id
        );
      END IF;
    END;
  END LOOP;

  -- Record confirmed workout
  INSERT INTO client_confirmed_workouts (client_id, training_session_id, performed_date, user_id)
  SELECT (x->>'client_id')::uuid, p_session_id, v_session.date::date, p_trainer_id
  FROM jsonb_array_elements(p_participants) x
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'status', 'completed',
    'session_id', p_session_id,
    'total_price', COALESCE(p_total_price, v_session.final_price),
    'participant_count', v_participant_count
  );
END;
$$;
