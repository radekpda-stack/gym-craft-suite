-- Add extended metric columns to exercise_entries
ALTER TABLE public.exercise_entries 
ADD COLUMN IF NOT EXISTS avg_watts INTEGER,
ADD COLUMN IF NOT EXISTS max_watts INTEGER,
ADD COLUMN IF NOT EXISTS avg_speed_kmh NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS max_speed_kmh NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS pace_sec_per_500m INTEGER,
ADD COLUMN IF NOT EXISTS pace_sec_per_km INTEGER,
ADD COLUMN IF NOT EXISTS cadence_spm INTEGER,
ADD COLUMN IF NOT EXISTS strokes INTEGER,
ADD COLUMN IF NOT EXISTS avg_heart_rate INTEGER,
ADD COLUMN IF NOT EXISTS max_heart_rate INTEGER,
ADD COLUMN IF NOT EXISTS rpe INTEGER,
ADD COLUMN IF NOT EXISTS leg_fatigue BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS incline_percent NUMERIC(4,1),
ADD COLUMN IF NOT EXISTS level INTEGER,
ADD COLUMN IF NOT EXISTS resistance INTEGER,
ADD COLUMN IF NOT EXISTS calories_kcal INTEGER,
ADD COLUMN IF NOT EXISTS metrics_json JSONB;

-- Add constraint for RPE
ALTER TABLE public.exercise_entries 
DROP CONSTRAINT IF EXISTS exercise_entries_rpe_check;

ALTER TABLE public.exercise_entries 
ADD CONSTRAINT exercise_entries_rpe_check CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10));

-- Create exercise_metric_definitions table for configurable metrics
CREATE TABLE IF NOT EXISTS public.exercise_metric_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
  exercise_category TEXT, -- alternative to exercise_id for category-based definitions
  metric_key TEXT NOT NULL,
  label TEXT NOT NULL,
  label_en TEXT,
  unit TEXT,
  input_type TEXT DEFAULT 'number' CHECK (input_type IN ('number', 'time', 'slider', 'boolean', 'text')),
  is_optional BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  show_in_table BOOLEAN DEFAULT true,
  show_in_stats BOOLEAN DEFAULT true,
  stat_role TEXT CHECK (stat_role IN ('best_is_min', 'best_is_max', 'avg', 'sum', 'latest')),
  default_value NUMERIC,
  min_value NUMERIC,
  max_value NUMERIC,
  primary_metric BOOLEAN DEFAULT false,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exercise_metric_definitions ENABLE ROW LEVEL SECURITY;

-- RLS policies for exercise_metric_definitions
CREATE POLICY "Users can view all metric definitions" 
ON public.exercise_metric_definitions 
FOR SELECT 
USING (true);

CREATE POLICY "Users can manage their own metric definitions" 
ON public.exercise_metric_definitions 
FOR ALL 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_exercise_metric_defs_exercise 
ON public.exercise_metric_definitions(exercise_id);

CREATE INDEX IF NOT EXISTS idx_exercise_metric_defs_category 
ON public.exercise_metric_definitions(exercise_category);

-- Add updated_at trigger
CREATE OR REPLACE TRIGGER update_exercise_metric_definitions_updated_at
BEFORE UPDATE ON public.exercise_metric_definitions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();