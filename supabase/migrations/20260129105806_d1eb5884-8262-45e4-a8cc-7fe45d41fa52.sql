-- Create table for tracking client percentile history over time
CREATE TABLE public.client_percentile_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  exercise_type TEXT NOT NULL DEFAULT 'strength',
  percentile INTEGER NOT NULL CHECK (percentile >= 0 AND percentile <= 100),
  best_value NUMERIC NOT NULL,
  metric_type TEXT NOT NULL DEFAULT 'weight',
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, exercise_name, recorded_at)
);

-- Add indexes for common queries
CREATE INDEX idx_percentile_history_client ON public.client_percentile_history(client_id);
CREATE INDEX idx_percentile_history_client_exercise ON public.client_percentile_history(client_id, exercise_name);
CREATE INDEX idx_percentile_history_recorded ON public.client_percentile_history(recorded_at DESC);

-- Enable RLS
ALTER TABLE public.client_percentile_history ENABLE ROW LEVEL SECURITY;

-- RLS policies - clients can view their own history
CREATE POLICY "Clients can view own percentile history"
ON public.client_percentile_history
FOR SELECT
USING (
  client_id IN (
    SELECT ca.client_id FROM public.client_accounts ca
    WHERE ca.auth_user_id = auth.uid()
  )
);

-- Trainers can view their clients' history
CREATE POLICY "Trainers can view client percentile history"
ON public.client_percentile_history
FOR SELECT
USING (
  client_id IN (
    SELECT c.id FROM public.clients c
    WHERE c.user_id = auth.uid()
  )
);

-- System can insert records (via edge function)
CREATE POLICY "System can insert percentile history"
ON public.client_percentile_history
FOR INSERT
WITH CHECK (true);

COMMENT ON TABLE public.client_percentile_history IS 'Tracks daily snapshots of client percentile rankings for progress visualization';