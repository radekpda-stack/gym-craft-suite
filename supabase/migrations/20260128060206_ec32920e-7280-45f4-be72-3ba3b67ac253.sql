-- Create missing table used by rpc_complete_training_session
CREATE TABLE IF NOT EXISTS public.training_idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  session_id UUID NOT NULL,
  trainer_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.training_idempotency_keys ENABLE ROW LEVEL SECURITY;

-- RLS: trainer can see/insert their own idempotency keys
DO $$ BEGIN
  CREATE POLICY "Users can view their own training idempotency keys"
  ON public.training_idempotency_keys
  FOR SELECT
  USING (auth.uid() = trainer_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert their own training idempotency keys"
  ON public.training_idempotency_keys
  FOR INSERT
  WITH CHECK (auth.uid() = trainer_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_training_idempotency_keys_session_id
  ON public.training_idempotency_keys(session_id);

CREATE INDEX IF NOT EXISTS idx_training_idempotency_keys_trainer_id
  ON public.training_idempotency_keys(trainer_id);
