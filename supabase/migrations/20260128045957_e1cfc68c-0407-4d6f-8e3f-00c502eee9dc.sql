
-- Drop the OLD function signature with uuid idempotency_key and jsonb trainer_summary
DROP FUNCTION IF EXISTS public.rpc_complete_training_session(
  p_session_id UUID,
  p_trainer_id UUID,
  p_idempotency_key UUID,
  p_payment_method TEXT,
  p_total_price NUMERIC,
  p_participants JSONB,
  p_trainer_summary JSONB,
  p_subjective_rating INTEGER,
  p_notes TEXT
);
