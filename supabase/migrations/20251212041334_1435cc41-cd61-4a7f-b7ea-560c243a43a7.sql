-- Create extended diagnostics table to store comprehensive assessment data
CREATE TABLE public.diagnostic_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  diagnostic_id UUID NOT NULL REFERENCES public.diagnostics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Personal Info
  handedness TEXT, -- pravák/levák
  occupation TEXT,
  sitting_hours_daily NUMERIC,
  
  -- Lifestyle
  sports_history TEXT,
  current_activities TEXT[],
  sleep_hours NUMERIC,
  sleep_quality INTEGER, -- 1-5
  stress_level INTEGER, -- 1-5
  regeneration_methods TEXT[],
  meditates BOOLEAN DEFAULT false,
  
  -- Health
  diseases TEXT[],
  surgeries TEXT[],
  injuries TEXT[],
  pain_areas TEXT[],
  allergies TEXT[],
  family_health_history TEXT,
  
  -- Goals
  short_term_goals TEXT,
  long_term_goals TEXT,
  training_priorities TEXT[],
  
  -- Mobility Assessment (1-5 scale or OK/limited/painful)
  mobility_ankles TEXT,
  mobility_hips TEXT,
  mobility_thoracic TEXT,
  mobility_shoulders TEXT,
  core_stability TEXT,
  
  -- Movement Quality
  squat_quality TEXT,
  lunge_quality TEXT,
  push_quality TEXT,
  pull_quality TEXT,
  hip_hinge_quality TEXT,
  
  -- Injury Screening (no_pain/mild/significant)
  pain_ankle TEXT,
  pain_knee TEXT,
  pain_hip TEXT,
  pain_si TEXT,
  pain_lumbar TEXT,
  pain_thoracic TEXT,
  pain_shoulder TEXT,
  pain_neck TEXT,
  
  -- Psychological Profile
  motivation_level INTEGER, -- 1-5
  discipline_level INTEGER, -- 1-5
  preferred_training_style TEXT,
  stress_management TEXT,
  
  -- Nutrition
  eating_regularity TEXT,
  food_allergies TEXT[],
  supplements TEXT[],
  dietary_restrictions TEXT[],
  
  -- AI Analysis
  ai_analysis TEXT,
  ai_risk_factors TEXT[],
  ai_strengths TEXT[],
  ai_priorities TEXT[],
  ai_recommendations TEXT,
  ai_contraindications TEXT[],
  ai_must_do_exercises TEXT[],
  ai_avoid_exercises TEXT[],
  
  -- Draft status
  is_draft BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE public.diagnostic_assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can create their own diagnostic_assessments"
ON public.diagnostic_assessments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own diagnostic_assessments"
ON public.diagnostic_assessments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own diagnostic_assessments"
ON public.diagnostic_assessments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own diagnostic_assessments"
ON public.diagnostic_assessments FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_diagnostic_assessments_updated_at
BEFORE UPDATE ON public.diagnostic_assessments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add extended client fields for anamnesis data
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS handedness TEXT,
ADD COLUMN IF NOT EXISTS occupation TEXT,
ADD COLUMN IF NOT EXISTS sitting_hours_daily NUMERIC,
ADD COLUMN IF NOT EXISTS sports_history TEXT,
ADD COLUMN IF NOT EXISTS current_activities TEXT[],
ADD COLUMN IF NOT EXISTS sleep_hours NUMERIC,
ADD COLUMN IF NOT EXISTS stress_level INTEGER,
ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT[],
ADD COLUMN IF NOT EXISTS supplements TEXT[];