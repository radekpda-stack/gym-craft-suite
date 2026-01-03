-- Test Goals: Target values for each test per client
CREATE TABLE public.test_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  test_definition_id UUID NOT NULL REFERENCES public.test_definitions(id) ON DELETE CASCADE,
  target_value NUMERIC NOT NULL,
  target_date DATE,
  achieved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (client_id, test_definition_id)
);

-- Test Schedules: Planned retests
CREATE TABLE public.test_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  test_definition_id UUID NOT NULL REFERENCES public.test_definitions(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  reminder_days_before INTEGER DEFAULT 3,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_session_id UUID REFERENCES public.test_sessions(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Test Batteries: Templates for multiple tests
CREATE TABLE public.test_batteries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  name_cs TEXT,
  description TEXT,
  test_definition_ids UUID[] NOT NULL DEFAULT '{}',
  recommended_order INTEGER[] DEFAULT '{}',
  rest_between_tests_minutes INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Test Context: Pre-test factors for each session
CREATE TABLE public.test_context (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_session_id UUID NOT NULL REFERENCES public.test_sessions(id) ON DELETE CASCADE UNIQUE,
  sleep_quality_1_5 INTEGER CHECK (sleep_quality_1_5 >= 1 AND sleep_quality_1_5 <= 5),
  sleep_hours NUMERIC,
  stress_level_1_5 INTEGER CHECK (stress_level_1_5 >= 1 AND stress_level_1_5 <= 5),
  motivation_level_1_5 INTEGER CHECK (motivation_level_1_5 >= 1 AND motivation_level_1_5 <= 5),
  nutrition_quality_1_5 INTEGER CHECK (nutrition_quality_1_5 >= 1 AND nutrition_quality_1_5 <= 5),
  hours_since_last_meal NUMERIC,
  caffeine_mg INTEGER,
  hydration_level_1_5 INTEGER CHECK (hydration_level_1_5 >= 1 AND hydration_level_1_5 <= 5),
  days_since_last_training INTEGER,
  last_training_intensity TEXT,
  subjective_readiness_1_10 INTEGER CHECK (subjective_readiness_1_10 >= 1 AND subjective_readiness_1_10 <= 10),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Test Benchmarks: Age/gender normative data
CREATE TABLE public.test_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_definition_id UUID NOT NULL REFERENCES public.test_definitions(id) ON DELETE CASCADE,
  gender TEXT CHECK (gender IN ('male', 'female', 'any')),
  age_min INTEGER,
  age_max INTEGER,
  percentile_5 NUMERIC,
  percentile_25 NUMERIC,
  percentile_50 NUMERIC,
  percentile_75 NUMERIC,
  percentile_95 NUMERIC,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.test_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_batteries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_benchmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for test_goals
CREATE POLICY "Users can view their own test goals"
ON public.test_goals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own test goals"
ON public.test_goals FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own test goals"
ON public.test_goals FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own test goals"
ON public.test_goals FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for test_schedules
CREATE POLICY "Users can view their own test schedules"
ON public.test_schedules FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own test schedules"
ON public.test_schedules FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own test schedules"
ON public.test_schedules FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own test schedules"
ON public.test_schedules FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for test_batteries
CREATE POLICY "Users can view their own test batteries"
ON public.test_batteries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own test batteries"
ON public.test_batteries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own test batteries"
ON public.test_batteries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own test batteries"
ON public.test_batteries FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for test_context (via test_sessions user_id)
CREATE POLICY "Users can view their own test context"
ON public.test_context FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.test_sessions ts 
  WHERE ts.id = test_session_id AND ts.user_id = auth.uid()
));

CREATE POLICY "Users can create their own test context"
ON public.test_context FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.test_sessions ts 
  WHERE ts.id = test_session_id AND ts.user_id = auth.uid()
));

CREATE POLICY "Users can update their own test context"
ON public.test_context FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.test_sessions ts 
  WHERE ts.id = test_session_id AND ts.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own test context"
ON public.test_context FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.test_sessions ts 
  WHERE ts.id = test_session_id AND ts.user_id = auth.uid()
));

-- RLS Policies for test_benchmarks (viewable by all authenticated users, editable by admin/trainers)
CREATE POLICY "All users can view test benchmarks"
ON public.test_benchmarks FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can manage their own test benchmarks"
ON public.test_benchmarks FOR ALL
USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_test_goals_updated_at
BEFORE UPDATE ON public.test_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_test_schedules_updated_at
BEFORE UPDATE ON public.test_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_test_batteries_updated_at
BEFORE UPDATE ON public.test_batteries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();