-- 1. Add exercise_type column to exercises table
ALTER TABLE public.exercises 
ADD COLUMN exercise_type TEXT DEFAULT 'strength'
CHECK (exercise_type IN ('strength', 'cardio', 'mobility', 'skill'));

-- 2. Migrate existing data: Kardio category → cardio type
UPDATE public.exercises 
SET exercise_type = 'cardio' 
WHERE category = 'Kardio' OR is_time_based = true;

-- 3. Create cardio_entries table
CREATE TABLE public.cardio_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  training_session_id UUID REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  
  -- Core performance (required)
  duration_seconds INTEGER NOT NULL,
  
  -- Distance & Speed
  distance_meters INTEGER,
  avg_speed_kmh NUMERIC(5,2),
  max_speed_kmh NUMERIC(5,2),
  
  -- Physiology
  avg_heart_rate INTEGER,
  max_heart_rate INTEGER,
  avg_watts INTEGER,
  max_watts INTEGER,
  
  -- Subjective
  rpe INTEGER CHECK (rpe BETWEEN 1 AND 10),
  leg_fatigue BOOLEAN DEFAULT false,
  notes TEXT,
  
  -- Metadata
  is_test BOOLEAN DEFAULT false,
  is_pr BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create mobility_entries table
CREATE TABLE public.mobility_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  training_session_id UUID REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  
  -- Duration
  duration_seconds INTEGER,
  sets INTEGER DEFAULT 1,
  hold_seconds INTEGER,
  
  -- Quality
  rpe INTEGER CHECK (rpe BETWEEN 1 AND 10),
  quality_rating TEXT CHECK (quality_rating IN ('poor', 'fair', 'good', 'excellent')),
  range_of_motion TEXT CHECK (range_of_motion IN ('limited', 'normal', 'full')),
  
  -- Sides
  side TEXT CHECK (side IN ('left', 'right', 'both', 'none')),
  
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create skill_entries table
CREATE TABLE public.skill_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  training_session_id UUID REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  
  -- Performance
  duration_seconds INTEGER,
  attempts INTEGER,
  successful INTEGER,
  
  -- Quality
  rpe INTEGER CHECK (rpe BETWEEN 1 AND 10),
  technique_rating TEXT CHECK (technique_rating IN ('learning', 'developing', 'competent', 'proficient', 'mastered')),
  
  -- Metadata
  is_breakthrough BOOLEAN DEFAULT false,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Enable RLS on all new tables
ALTER TABLE public.cardio_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobility_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_entries ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for cardio_entries
CREATE POLICY "Users can view own cardio entries" ON public.cardio_entries
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own cardio entries" ON public.cardio_entries
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cardio entries" ON public.cardio_entries
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cardio entries" ON public.cardio_entries
FOR DELETE USING (auth.uid() = user_id);

-- 8. RLS Policies for mobility_entries
CREATE POLICY "Users can view own mobility entries" ON public.mobility_entries
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own mobility entries" ON public.mobility_entries
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mobility entries" ON public.mobility_entries
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mobility entries" ON public.mobility_entries
FOR DELETE USING (auth.uid() = user_id);

-- 9. RLS Policies for skill_entries
CREATE POLICY "Users can view own skill entries" ON public.skill_entries
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own skill entries" ON public.skill_entries
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skill entries" ON public.skill_entries
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own skill entries" ON public.skill_entries
FOR DELETE USING (auth.uid() = user_id);

-- 10. Indexes for performance
CREATE INDEX idx_cardio_entries_client_date ON public.cardio_entries(client_id, date DESC);
CREATE INDEX idx_cardio_entries_exercise ON public.cardio_entries(exercise_id);
CREATE INDEX idx_cardio_entries_user ON public.cardio_entries(user_id);

CREATE INDEX idx_mobility_entries_client_date ON public.mobility_entries(client_id, date DESC);
CREATE INDEX idx_mobility_entries_exercise ON public.mobility_entries(exercise_id);
CREATE INDEX idx_mobility_entries_user ON public.mobility_entries(user_id);

CREATE INDEX idx_skill_entries_client_date ON public.skill_entries(client_id, date DESC);
CREATE INDEX idx_skill_entries_exercise ON public.skill_entries(exercise_id);
CREATE INDEX idx_skill_entries_user ON public.skill_entries(user_id);

-- 11. Create updated_at triggers for new tables
CREATE TRIGGER update_cardio_entries_updated_at
  BEFORE UPDATE ON public.cardio_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mobility_entries_updated_at
  BEFORE UPDATE ON public.mobility_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_skill_entries_updated_at
  BEFORE UPDATE ON public.skill_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();