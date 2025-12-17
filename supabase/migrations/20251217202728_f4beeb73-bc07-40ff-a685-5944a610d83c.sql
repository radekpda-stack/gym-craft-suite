-- EXERCISE LIBRARY ENHANCEMENT (without pg_trgm)
-- Add new columns to exercises table (preserving existing)

ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS name_cs text,
ADD COLUMN IF NOT EXISTS name_en text,
ADD COLUMN IF NOT EXISTS slug text,
ADD COLUMN IF NOT EXISTS search_name text,
ADD COLUMN IF NOT EXISTS description_cs text,
ADD COLUMN IF NOT EXISTS description_en text,
ADD COLUMN IF NOT EXISTS instructions_cs text,
ADD COLUMN IF NOT EXISTS instructions_en text,
ADD COLUMN IF NOT EXISTS difficulty text,
ADD COLUMN IF NOT EXISTS movement_pattern text,
ADD COLUMN IF NOT EXISTS is_unilateral boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_bodyweight boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_time_based boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS default_unit text NOT NULL DEFAULT 'reps',
ADD COLUMN IF NOT EXISTS video_url text,
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'custom',
ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- Add check constraints
ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_difficulty_check;
ALTER TABLE public.exercises ADD CONSTRAINT exercises_difficulty_check 
  CHECK (difficulty IS NULL OR difficulty IN ('beginner', 'intermediate', 'advanced'));

ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_movement_pattern_check;
ALTER TABLE public.exercises ADD CONSTRAINT exercises_movement_pattern_check 
  CHECK (movement_pattern IS NULL OR movement_pattern IN (
    'squat', 'hinge', 'lunge',
    'push_horizontal', 'push_vertical',
    'pull_horizontal', 'pull_vertical',
    'carry',
    'core_anti_extension', 'core_anti_rotation', 'core_anti_lateral_flexion',
    'rotation', 'locomotion', 'conditioning', 'mobility', 'other'
  ));

ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_default_unit_check;
ALTER TABLE public.exercises ADD CONSTRAINT exercises_default_unit_check 
  CHECK (default_unit IN ('reps', 'seconds', 'meters', 'calories'));

ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_source_check;
ALTER TABLE public.exercises ADD CONSTRAINT exercises_source_check 
  CHECK (source IN ('system', 'custom', 'import'));

-- Migrate existing name to name_cs where null
UPDATE public.exercises SET name_cs = name WHERE name_cs IS NULL;

-- Create function to generate slug from text (remove diacritics)
CREATE OR REPLACE FUNCTION public.normalize_text(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN lower(
    translate(
      regexp_replace(trim(input_text), '\s+', '-', 'g'),
      'áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽäëïöüÄËÏÖÜ',
      'acdeeinorstuuyzACDEEINORSTUUYZaeiouAEIOU'
    )
  );
END;
$$;

-- Create function to generate search_name (normalized for search)
CREATE OR REPLACE FUNCTION public.generate_search_name(name_cs text, name_en text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN public.normalize_text(coalesce(name_cs, '') || ' ' || coalesce(name_en, ''));
END;
$$;

-- Generate slug and search_name for existing exercises
UPDATE public.exercises 
SET 
  slug = COALESCE(slug, public.normalize_text(COALESCE(name_cs, name))),
  search_name = public.generate_search_name(COALESCE(name_cs, name), name_en);

-- Add unique constraint on slug per user
CREATE UNIQUE INDEX IF NOT EXISTS exercises_user_slug_unique 
ON public.exercises (user_id, slug) WHERE user_id IS NOT NULL;

-- Performance indexes (without pg_trgm)
CREATE INDEX IF NOT EXISTS idx_exercises_user_archived ON public.exercises (user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_exercises_movement_pattern ON public.exercises (movement_pattern) WHERE movement_pattern IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty ON public.exercises (difficulty) WHERE difficulty IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exercises_search_name ON public.exercises (search_name);

-- Create exercise_muscles table
CREATE TABLE IF NOT EXISTS public.exercise_muscles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  muscle text NOT NULL,
  role text NOT NULL DEFAULT 'primary',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exercise_muscles_muscle_check CHECK (muscle IN (
    'glutes', 'quadriceps', 'hamstrings', 'adductors', 'abductors',
    'calves', 'tibialis_anterior',
    'erectors',
    'lats', 'upper_back', 'traps_upper',
    'rear_delts', 'delts',
    'chest',
    'biceps', 'triceps', 'forearms',
    'core', 'obliques', 'hip_flexors',
    'rotator_cuff', 'serratus', 'neck'
  )),
  CONSTRAINT exercise_muscles_role_check CHECK (role IN ('primary', 'secondary', 'stabilizer')),
  CONSTRAINT exercise_muscles_unique UNIQUE (exercise_id, muscle)
);

CREATE INDEX IF NOT EXISTS idx_exercise_muscles_exercise ON public.exercise_muscles (exercise_id);

-- Enable RLS on exercise_muscles
ALTER TABLE public.exercise_muscles ENABLE ROW LEVEL SECURITY;

-- RLS policies for exercise_muscles (same access as exercises)
CREATE POLICY "Users can view exercise_muscles for their exercises"
ON public.exercise_muscles FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.exercises e 
  WHERE e.id = exercise_muscles.exercise_id 
  AND (e.user_id = auth.uid() OR e.user_id IS NULL)
));

CREATE POLICY "Users can create exercise_muscles for their exercises"
ON public.exercise_muscles FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.exercises e 
  WHERE e.id = exercise_muscles.exercise_id 
  AND e.user_id = auth.uid()
));

CREATE POLICY "Users can update exercise_muscles for their exercises"
ON public.exercise_muscles FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.exercises e 
  WHERE e.id = exercise_muscles.exercise_id 
  AND e.user_id = auth.uid()
));

CREATE POLICY "Users can delete exercise_muscles for their exercises"
ON public.exercise_muscles FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.exercises e 
  WHERE e.id = exercise_muscles.exercise_id 
  AND e.user_id = auth.uid()
));

-- Create exercise_equipment table
CREATE TABLE IF NOT EXISTS public.exercise_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  equipment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exercise_equipment_check CHECK (equipment IN (
    'bodyweight', 'barbell', 'dumbbell', 'kettlebell', 'cable', 'machine', 'bands',
    'bench', 'pullup_bar', 'rings', 'trx', 'box',
    'medicine_ball', 'slam_ball',
    'rower', 'ski_erg', 'treadmill', 'treadmill_sled_mode',
    'sled', 'landmine', 'hex_bar', 'plyo_platform', 'other'
  )),
  CONSTRAINT exercise_equipment_unique UNIQUE (exercise_id, equipment)
);

CREATE INDEX IF NOT EXISTS idx_exercise_equipment_exercise ON public.exercise_equipment (exercise_id);

-- Enable RLS on exercise_equipment
ALTER TABLE public.exercise_equipment ENABLE ROW LEVEL SECURITY;

-- RLS policies for exercise_equipment
CREATE POLICY "Users can view exercise_equipment for their exercises"
ON public.exercise_equipment FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.exercises e 
  WHERE e.id = exercise_equipment.exercise_id 
  AND (e.user_id = auth.uid() OR e.user_id IS NULL)
));

CREATE POLICY "Users can create exercise_equipment for their exercises"
ON public.exercise_equipment FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.exercises e 
  WHERE e.id = exercise_equipment.exercise_id 
  AND e.user_id = auth.uid()
));

CREATE POLICY "Users can update exercise_equipment for their exercises"
ON public.exercise_equipment FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.exercises e 
  WHERE e.id = exercise_equipment.exercise_id 
  AND e.user_id = auth.uid()
));

CREATE POLICY "Users can delete exercise_equipment for their exercises"
ON public.exercise_equipment FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.exercises e 
  WHERE e.id = exercise_equipment.exercise_id 
  AND e.user_id = auth.uid()
));

-- Create exercise_relations table
CREATE TABLE IF NOT EXISTS public.exercise_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  related_exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  relation_type text NOT NULL,
  note_cs text,
  note_en text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exercise_relations_type_check CHECK (relation_type IN ('variant', 'regression', 'progression', 'alternative', 'prep')),
  CONSTRAINT exercise_relations_unique UNIQUE (exercise_id, related_exercise_id, relation_type),
  CONSTRAINT exercise_relations_no_self CHECK (exercise_id != related_exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_exercise_relations_exercise ON public.exercise_relations (exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_relations_related ON public.exercise_relations (related_exercise_id);

-- Enable RLS on exercise_relations
ALTER TABLE public.exercise_relations ENABLE ROW LEVEL SECURITY;

-- RLS policies for exercise_relations
CREATE POLICY "Users can view exercise_relations for their exercises"
ON public.exercise_relations FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.exercises e 
  WHERE e.id = exercise_relations.exercise_id 
  AND (e.user_id = auth.uid() OR e.user_id IS NULL)
));

CREATE POLICY "Users can create exercise_relations for their exercises"
ON public.exercise_relations FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.exercises e 
  WHERE e.id = exercise_relations.exercise_id 
  AND e.user_id = auth.uid()
));

CREATE POLICY "Users can update exercise_relations for their exercises"
ON public.exercise_relations FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.exercises e 
  WHERE e.id = exercise_relations.exercise_id 
  AND e.user_id = auth.uid()
));

CREATE POLICY "Users can delete exercise_relations for their exercises"
ON public.exercise_relations FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.exercises e 
  WHERE e.id = exercise_relations.exercise_id 
  AND e.user_id = auth.uid()
));