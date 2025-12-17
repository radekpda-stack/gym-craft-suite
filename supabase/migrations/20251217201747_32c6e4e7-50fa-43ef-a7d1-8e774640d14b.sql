-- =============================================
-- TRAINING PLANS MODULE - CORE TABLES
-- =============================================

-- Hlavní tabulka tréninkových plánů
CREATE TABLE public.training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  primary_goal TEXT NOT NULL, -- síla/hypertrofie/vytrvalost/OCR/rehab/mixed
  secondary_goal TEXT,
  period_start DATE NOT NULL,
  period_end DATE,
  phase TEXT DEFAULT 'base', -- base/build/peak/deload/rehab
  days_per_week INTEGER DEFAULT 3,
  equipment TEXT[] DEFAULT '{}',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL
);

-- Týdny v plánu
CREATE TABLE public.plan_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_plan_id UUID NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  focus_note TEXT,
  deload_flag BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL
);

-- Dny v týdnu
CREATE TABLE public.plan_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_week_id UUID NOT NULL REFERENCES public.plan_weeks(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL, -- 1-7
  intended_focus TEXT, -- upper/lower/full/run/skill/recovery
  optional_flag BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL
);

-- Šablony tréninků
CREATE TABLE public.plan_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_day_id UUID NOT NULL REFERENCES public.plan_days(id) ON DELETE CASCADE,
  workout_name TEXT NOT NULL,
  workout_type TEXT DEFAULT 'strength', -- strength/run/conditioning/hybrid
  estimated_duration INTEGER DEFAULT 60,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL
);

-- Cviky v šabloně
CREATE TABLE public.plan_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_workout_id UUID NOT NULL REFERENCES public.plan_workouts(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id),
  exercise_name TEXT NOT NULL,
  target_sets INTEGER DEFAULT 3,
  target_reps_min INTEGER,
  target_reps_max INTEGER,
  target_rpe DECIMAL,
  target_rir INTEGER,
  tempo TEXT, -- např. "3-1-2-0"
  rest_seconds INTEGER DEFAULT 90,
  progression_type TEXT DEFAULT 'load', -- load/reps/density
  alternative_exercise_id UUID REFERENCES public.exercises(id),
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL
);

-- Pravidla autoprogrese
CREATE TABLE public.progression_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  condition_type TEXT NOT NULL, -- rpe_met/rpe_exceeded/rpe_failed/consecutive_failure
  condition_threshold DECIMAL,
  action_type TEXT NOT NULL, -- increase_load/increase_reps/decrease_volume/switch_exercise/trigger_deload
  action_value DECIMAL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID
);

-- Log autoprogrese
CREATE TABLE public.progression_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_session_id UUID REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  plan_exercise_id UUID REFERENCES public.plan_exercises(id),
  exercise_id UUID REFERENCES public.exercises(id),
  rule_id UUID REFERENCES public.progression_rules(id),
  old_value JSONB,
  new_value JSONB,
  was_manual_override BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL
);

-- Rozšíření training_sessions o vazbu na plány
ALTER TABLE public.training_sessions 
ADD COLUMN IF NOT EXISTS training_plan_id UUID REFERENCES public.training_plans(id),
ADD COLUMN IF NOT EXISTS plan_week_id UUID REFERENCES public.plan_weeks(id),
ADD COLUMN IF NOT EXISTS plan_day_id UUID REFERENCES public.plan_days(id),
ADD COLUMN IF NOT EXISTS plan_workout_id UUID REFERENCES public.plan_workouts(id),
ADD COLUMN IF NOT EXISTS is_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS completion_quality TEXT; -- splněno/částečně/nesplněno

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_log ENABLE ROW LEVEL SECURITY;

-- Training Plans policies
CREATE POLICY "Users can view their own training_plans" ON public.training_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own training_plans" ON public.training_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own training_plans" ON public.training_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own training_plans" ON public.training_plans FOR DELETE USING (auth.uid() = user_id);

-- Plan Weeks policies
CREATE POLICY "Users can view their own plan_weeks" ON public.plan_weeks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own plan_weeks" ON public.plan_weeks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own plan_weeks" ON public.plan_weeks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own plan_weeks" ON public.plan_weeks FOR DELETE USING (auth.uid() = user_id);

-- Plan Days policies
CREATE POLICY "Users can view their own plan_days" ON public.plan_days FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own plan_days" ON public.plan_days FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own plan_days" ON public.plan_days FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own plan_days" ON public.plan_days FOR DELETE USING (auth.uid() = user_id);

-- Plan Workouts policies
CREATE POLICY "Users can view their own plan_workouts" ON public.plan_workouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own plan_workouts" ON public.plan_workouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own plan_workouts" ON public.plan_workouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own plan_workouts" ON public.plan_workouts FOR DELETE USING (auth.uid() = user_id);

-- Plan Exercises policies
CREATE POLICY "Users can view their own plan_exercises" ON public.plan_exercises FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own plan_exercises" ON public.plan_exercises FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own plan_exercises" ON public.plan_exercises FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own plan_exercises" ON public.plan_exercises FOR DELETE USING (auth.uid() = user_id);

-- Progression Rules policies
CREATE POLICY "Users can view progression_rules" ON public.progression_rules FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can create their own progression_rules" ON public.progression_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own progression_rules" ON public.progression_rules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own progression_rules" ON public.progression_rules FOR DELETE USING (auth.uid() = user_id);

-- Progression Log policies
CREATE POLICY "Users can view their own progression_log" ON public.progression_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own progression_log" ON public.progression_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own progression_log" ON public.progression_log FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own progression_log" ON public.progression_log FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- DEFAULT PROGRESSION RULES
-- =============================================

INSERT INTO public.progression_rules (name, description, condition_type, condition_threshold, action_type, action_value, is_default, user_id)
VALUES 
  ('RPE Met - Increase Load', 'When target RPE is met, increase load by 2.5-5%', 'rpe_met', 0, 'increase_load', 2.5, true, NULL),
  ('RPE Met - Increase Reps', 'When target RPE is met, increase reps by 1', 'rpe_met', 0, 'increase_reps', 1, true, NULL),
  ('RPE Exceeded - Decrease Volume', 'When RPE exceeded by 2+, reduce sets', 'rpe_exceeded', 2, 'decrease_volume', 1, true, NULL),
  ('Consecutive Failure - Deload', 'After 2 consecutive failures, trigger deload', 'consecutive_failure', 2, 'trigger_deload', 1, true, NULL),
  ('RPE Failed - Switch Exercise', 'When RPE consistently failed, suggest alternative', 'rpe_failed', 3, 'switch_exercise', 0, true, NULL);

-- Trigger for updated_at
CREATE TRIGGER update_training_plans_updated_at
  BEFORE UPDATE ON public.training_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();