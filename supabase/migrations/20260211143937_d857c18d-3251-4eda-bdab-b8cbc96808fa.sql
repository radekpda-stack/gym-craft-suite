
-- 1. Add next_session_focus column to training_sessions
ALTER TABLE public.training_sessions 
ADD COLUMN IF NOT EXISTS next_session_focus text;

-- 2. Create pre_session_checkins table
CREATE TABLE public.pre_session_checkins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_session_id uuid NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  energy_level smallint CHECK (energy_level BETWEEN 1 AND 5),
  sleep_quality smallint CHECK (sleep_quality BETWEEN 1 AND 5),
  pain_area text,
  pain_notes text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pre_session_checkins ENABLE ROW LEVEL SECURITY;

-- RLS policies for trainers
CREATE POLICY "Trainers can manage own checkins"
ON public.pre_session_checkins FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Index for fast lookup
CREATE INDEX idx_pre_session_checkins_session ON public.pre_session_checkins(training_session_id);
CREATE INDEX idx_pre_session_checkins_client ON public.pre_session_checkins(client_id);
