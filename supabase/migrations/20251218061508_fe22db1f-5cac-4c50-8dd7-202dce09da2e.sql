-- Add meal_type to nutrition_food_entries
ALTER TABLE public.nutrition_food_entries 
ADD COLUMN IF NOT EXISTS meal_type text;

-- Add portion_estimate for hand-based sizing
ALTER TABLE public.nutrition_food_entries 
ADD COLUMN IF NOT EXISTS portion_estimate text;

-- Add photo_url for optional food photos (already exists, verify)
-- ALTER TABLE public.nutrition_food_entries ADD COLUMN IF NOT EXISTS photo_url text;

-- Create table for storing AI nutrition analysis per day
CREATE TABLE IF NOT EXISTS public.nutrition_daily_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.nutrition_log_sessions(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  analysis_date date NOT NULL,
  
  -- Calorie analysis
  calorie_range_low integer,
  calorie_range_high integer,
  calorie_level text, -- low, medium, high
  
  -- Macronutrient breakdown (from AI)
  protein_sources jsonb DEFAULT '[]',
  carb_sources jsonb DEFAULT '[]',
  fat_sources jsonb DEFAULT '[]',
  vegetables_fruits jsonb DEFAULT '[]',
  ultra_processed jsonb DEFAULT '[]',
  
  -- Quality scores (0-5, stored but displayed as text)
  protein_score integer,
  vegetable_fiber_score integer,
  carb_quality_score integer,
  fat_quality_score integer,
  meal_regularity_score integer,
  hydration_score integer,
  ultra_processed_score integer,
  alcohol_sugar_score integer,
  
  -- Feedback for client
  feedback_positive text,
  feedback_improve text,
  feedback_suggestions jsonb DEFAULT '[]',
  
  -- Metadata
  analyzed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  user_id uuid
);

-- Create table for weekly summary
CREATE TABLE IF NOT EXISTS public.nutrition_weekly_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.nutrition_log_sessions(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Energy summary
  avg_calorie_range_low integer,
  avg_calorie_range_high integer,
  calorie_trend text, -- stable, increasing, decreasing, irregular
  
  -- Quality trends
  avg_quality_scores jsonb,
  quality_trend_summary text,
  
  -- Client summary
  client_strengths jsonb DEFAULT '[]',
  client_weaknesses jsonb DEFAULT '[]',
  client_recommendations jsonb DEFAULT '[]',
  
  -- Trainer summary
  trainer_risks jsonb DEFAULT '[]',
  trainer_observations text,
  trainer_conclusion text,
  
  -- Metadata
  analyzed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  user_id uuid
);

-- Enable RLS
ALTER TABLE public.nutrition_daily_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_weekly_summary ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily analysis
CREATE POLICY "Users can view their own nutrition_daily_analysis"
  ON public.nutrition_daily_analysis FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own nutrition_daily_analysis"
  ON public.nutrition_daily_analysis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nutrition_daily_analysis"
  ON public.nutrition_daily_analysis FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own nutrition_daily_analysis"
  ON public.nutrition_daily_analysis FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for weekly summary
CREATE POLICY "Users can view their own nutrition_weekly_summary"
  ON public.nutrition_weekly_summary FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own nutrition_weekly_summary"
  ON public.nutrition_weekly_summary FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nutrition_weekly_summary"
  ON public.nutrition_weekly_summary FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own nutrition_weekly_summary"
  ON public.nutrition_weekly_summary FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_nutrition_daily_analysis_session_date 
  ON public.nutrition_daily_analysis(session_id, analysis_date);
  
CREATE INDEX IF NOT EXISTS idx_nutrition_weekly_summary_session 
  ON public.nutrition_weekly_summary(session_id);