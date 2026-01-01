-- ================================================
-- P0 FIX: Atomické dokončení multi-client tréninku
-- ================================================

-- 1. Audit log tabulka pro dokončení sessions
CREATE TABLE IF NOT EXISTS session_completion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now(),
  idempotency_key UUID NOT NULL UNIQUE,
  participant_count INTEGER NOT NULL,
  total_price NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  participants JSONB NOT NULL,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pro rychlé vyhledávání
CREATE INDEX idx_session_completion_log_session ON session_completion_log(training_session_id);
CREATE INDEX idx_session_completion_log_trainer ON session_completion_log(trainer_id);
CREATE INDEX idx_session_completion_log_created ON session_completion_log(created_at DESC);

-- RLS pro session_completion_log
ALTER TABLE session_completion_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own completion logs"
ON session_completion_log FOR SELECT
USING (trainer_id = auth.uid());

CREATE POLICY "Users can insert own completion logs"
ON session_completion_log FOR INSERT
WITH CHECK (trainer_id = auth.uid());

-- 2. Error logging tabulka
CREATE TABLE IF NOT EXISTS app_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  screen TEXT,
  user_id UUID,
  role TEXT,
  endpoint TEXT,
  session_id UUID,
  payload_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_app_errors_created ON app_errors(created_at DESC);
CREATE INDEX idx_app_errors_type ON app_errors(error_type, created_at DESC);
CREATE INDEX idx_app_errors_user ON app_errors(user_id);

-- RLS pro app_errors
ALTER TABLE app_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own errors"
ON app_errors FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert errors"
ON app_errors FOR INSERT
WITH CHECK (true);

-- 3. Upravit unique index pro multi-client (per session + client + type)
DROP INDEX IF EXISTS idx_unique_training_transaction;

CREATE UNIQUE INDEX idx_unique_training_client_transaction 
ON credit_transactions(training_session_id, client_id, type) 
WHERE training_session_id IS NOT NULL AND type = 'training';

-- 4. Atomická RPC funkce pro dokončení tréninku
CREATE OR REPLACE FUNCTION rpc_complete_training_session(
  p_session_id UUID,
  p_trainer_id UUID,
  p_idempotency_key UUID,
  p_payment_method TEXT,
  p_total_price NUMERIC,
  p_participants JSONB,
  p_trainer_summary JSONB DEFAULT NULL,
  p_subjective_rating INTEGER DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        WHEN p_payment_method = 'pending' THEN 'pending'
        ELSE 'paid'
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
$$;