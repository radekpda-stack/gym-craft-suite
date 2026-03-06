DROP FUNCTION IF EXISTS public.rpc_complete_training_session(uuid,uuid,text,text,numeric,jsonb,text,integer,text);

CREATE OR REPLACE FUNCTION public.rpc_complete_training_session(
  p_session_id uuid,
  p_trainer_id uuid,
  p_idempotency_key text,
  p_payment_method text,
  p_total_price numeric,
  p_participants jsonb,
  p_trainer_summary text,
  p_subjective_rating integer,
  p_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_record RECORD;
  v_participant RECORD;
  v_participant_count INTEGER;
  v_budget_group_id UUID;
  v_current_balance NUMERIC;
  v_deducted_groups UUID[] := ARRAY[]::UUID[];
  v_summary_json JSONB;
  v_result JSONB;
BEGIN
  v_summary_json := NULL;
  IF p_trainer_summary IS NOT NULL AND length(trim(p_trainer_summary)) > 0 THEN
    BEGIN
      v_summary_json := p_trainer_summary::jsonb;
    EXCEPTION WHEN others THEN
      v_summary_json := NULL;
    END;
  END IF;

  SELECT * INTO v_session_record
  FROM training_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Training session not found';
  END IF;

  IF v_session_record.status = 'completed' THEN
    RETURN jsonb_build_object('success', true, 'already_completed', true);
  END IF;

  v_participant_count := GREATEST(jsonb_array_length(p_participants), 1);

  UPDATE training_sessions SET
    status = 'completed',
    payment_method = COALESCE(p_payment_method, payment_method),
    final_price = COALESCE(p_total_price, v_session_record.final_price),
    participant_count = v_participant_count,
    subjective_rating = COALESCE(p_subjective_rating, v_session_record.subjective_rating),
    notes = COALESCE(p_notes, v_session_record.notes),
    trainer_went_well = CASE WHEN v_summary_json IS NOT NULL THEN COALESCE(v_summary_json->>'went_well', v_summary_json->>'trainer_went_well') ELSE trainer_went_well END,
    trainer_problems = CASE WHEN v_summary_json IS NOT NULL THEN COALESCE(v_summary_json->>'problems', v_summary_json->>'trainer_problems') ELSE trainer_problems END,
    trainer_recommendations = CASE WHEN v_summary_json IS NOT NULL THEN COALESCE(v_summary_json->>'recommendations', v_summary_json->>'trainer_recommendations') ELSE trainer_recommendations END,
    pain_reported = CASE WHEN v_summary_json IS NOT NULL AND v_summary_json->>'pain_reported' IS NOT NULL THEN (v_summary_json->>'pain_reported')::boolean ELSE pain_reported END,
    pain_notes = CASE WHEN v_summary_json IS NOT NULL THEN v_summary_json->>'pain_notes' ELSE pain_notes END,
    updated_at = now()
  WHERE id = p_session_id;

  FOR v_participant IN SELECT * FROM jsonb_to_recordset(p_participants) AS x(
    client_id uuid, price numeric, payment_method text
  ) LOOP
    DECLARE
      v_pm TEXT := COALESCE(v_participant.payment_method, p_payment_method, 'credit');
      v_price NUMERIC := COALESCE(v_participant.price, 0);
    BEGIN
      SELECT cbm.group_id INTO v_budget_group_id
      FROM client_budget_members cbm
      WHERE cbm.client_id = v_participant.client_id
      LIMIT 1;

      IF v_pm = 'credit' AND v_price > 0 THEN
        IF v_budget_group_id IS NOT NULL THEN
          IF NOT (v_budget_group_id = ANY(v_deducted_groups)) THEN
            SELECT shared_balance INTO v_current_balance
            FROM client_budget_groups
            WHERE id = v_budget_group_id
            FOR UPDATE;

            INSERT INTO credit_transactions (
              client_id, amount, type, description,
              payment_method, source_type, source_id, group_id
            ) VALUES (
              v_participant.client_id, -v_price, 'deduction',
              'Trénink (skupinový rozpočet)',
              'credit', 'training', p_session_id, v_budget_group_id
            );

            UPDATE client_budget_groups
            SET shared_balance = shared_balance - v_price,
                updated_at = now()
            WHERE id = v_budget_group_id;

            v_deducted_groups := array_append(v_deducted_groups, v_budget_group_id);
          END IF;
        ELSE
          PERFORM id FROM clients WHERE id = v_participant.client_id FOR UPDATE;

          INSERT INTO credit_transactions (
            client_id, amount, type, description,
            payment_method, source_type, source_id
          ) VALUES (
            v_participant.client_id, -v_price, 'deduction',
            'Trénink',
            'credit', 'training', p_session_id
          );
        END IF;
      ELSIF v_price > 0 THEN
        INSERT INTO credit_transactions (
          client_id, amount, type, description,
          payment_method, source_type, source_id
        ) VALUES (
          v_participant.client_id, 0, 'payment',
          'Trénink (' || v_pm || ')',
          v_pm, 'training', p_session_id
        );
      END IF;

      INSERT INTO client_confirmed_workouts (client_id, training_session_id, performed_date, performed_at, confirmed_by)
      VALUES (v_participant.client_id, p_session_id, v_session_record.date::date, NOW(), 'coach')
      ON CONFLICT DO NOTHING;
    END;
  END LOOP;

  IF p_payment_method = 'credit' THEN
    UPDATE training_sessions SET payment_status = 'paid_credit' WHERE id = p_session_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'session_id', p_session_id);
END;
$$;