-- Add new columns to nutrition_food_entries for quality, satiation, and energy tracking
ALTER TABLE public.nutrition_food_entries 
  ADD COLUMN IF NOT EXISTS quality TEXT,
  ADD COLUMN IF NOT EXISTS satiation TEXT,
  ADD COLUMN IF NOT EXISTS feeling_after TEXT,
  ADD COLUMN IF NOT EXISTS energy_after TEXT;

-- Create table for tracking empty/skipped days
CREATE TABLE IF NOT EXISTS public.nutrition_day_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.nutrition_log_sessions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  day_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('has_entries', 'no_entries', 'skipped')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID,
  UNIQUE(session_id, day_date)
);

-- Enable RLS on nutrition_day_status
ALTER TABLE public.nutrition_day_status ENABLE ROW LEVEL SECURITY;

-- RLS policies for nutrition_day_status
CREATE POLICY "Users can view their own day status"
  ON public.nutrition_day_status
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own day status"
  ON public.nutrition_day_status
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own day status"
  ON public.nutrition_day_status
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own day status"
  ON public.nutrition_day_status
  FOR DELETE
  USING (auth.uid() = user_id);

-- Public access for day status (for public nutrition log form)
CREATE POLICY "Public can insert day status via token"
  ON public.nutrition_day_status
  FOR INSERT
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Public can view day status"
  ON public.nutrition_day_status
  FOR SELECT
  USING (true);