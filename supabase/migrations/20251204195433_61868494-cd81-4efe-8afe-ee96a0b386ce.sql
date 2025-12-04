-- Add is_archived column to clients table for soft delete functionality
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster filtering by archived status
CREATE INDEX IF NOT EXISTS idx_clients_is_archived ON public.clients(is_archived);

-- Add user_id column to measurements, diagnostics, credit_transactions if missing (for API access)
-- These should already exist based on the schema, but ensuring they do

-- Create workout_entries table for exercise sets tracking (optional feature)
CREATE TABLE IF NOT EXISTS public.workout_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL,
  set_number INTEGER NOT NULL DEFAULT 1,
  weight_kg NUMERIC,
  reps INTEGER,
  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID
);

-- Enable RLS on workout_entries
ALTER TABLE public.workout_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for workout_entries
CREATE POLICY "Users can view their own workout_entries"
ON public.workout_entries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.training_sessions
    WHERE training_sessions.id = workout_entries.training_session_id
    AND training_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own workout_entries"
ON public.workout_entries
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.training_sessions
    WHERE training_sessions.id = workout_entries.training_session_id
    AND training_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own workout_entries"
ON public.workout_entries
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.training_sessions
    WHERE training_sessions.id = workout_entries.training_session_id
    AND training_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own workout_entries"
ON public.workout_entries
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.training_sessions
    WHERE training_sessions.id = workout_entries.training_session_id
    AND training_sessions.user_id = auth.uid()
  )
);