-- Drop existing default_unit check constraint
ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_default_unit_check;

-- Add new check constraint that includes 'cardio_machine'
ALTER TABLE public.exercises 
ADD CONSTRAINT exercises_default_unit_check 
CHECK (default_unit = ANY (ARRAY['reps'::text, 'seconds'::text, 'meters'::text, 'calories'::text, 'cardio_machine'::text]));

-- Insert 12 new cardio machine exercises
INSERT INTO public.exercises (name, name_cs, name_en, category, default_unit, is_time_based, equipment, muscle_groups, source, is_bodyweight)
VALUES 
  -- Rower exercises
  ('Veslo - 500m', 'Veslo - 500m', 'Rower - 500m', 'Kardio', 'cardio_machine', true, ARRAY['rower'], ARRAY['lats', 'quadriceps', 'core'], 'system', false),
  ('Veslo - 1000m', 'Veslo - 1000m', 'Rower - 1000m', 'Kardio', 'cardio_machine', true, ARRAY['rower'], ARRAY['lats', 'quadriceps', 'core'], 'system', false),
  ('Veslo - 2000m', 'Veslo - 2000m', 'Rower - 2000m', 'Kardio', 'cardio_machine', true, ARRAY['rower'], ARRAY['lats', 'quadriceps', 'core'], 'system', false),
  ('Veslo - Intervaly', 'Veslo - Intervaly', 'Rower - Intervals', 'Kardio', 'cardio_machine', true, ARRAY['rower'], ARRAY['lats', 'quadriceps', 'core'], 'system', false),
  -- SkiErg exercises
  ('SkiErg - 500m', 'SkiErg - 500m', 'SkiErg - 500m', 'Kardio', 'cardio_machine', true, ARRAY['ski_erg'], ARRAY['lats', 'triceps', 'core'], 'system', false),
  ('SkiErg - 1000m', 'SkiErg - 1000m', 'SkiErg - 1000m', 'Kardio', 'cardio_machine', true, ARRAY['ski_erg'], ARRAY['lats', 'triceps', 'core'], 'system', false),
  ('SkiErg - 2000m', 'SkiErg - 2000m', 'SkiErg - 2000m', 'Kardio', 'cardio_machine', true, ARRAY['ski_erg'], ARRAY['lats', 'triceps', 'core'], 'system', false),
  ('SkiErg - Intervaly', 'SkiErg - Intervaly', 'SkiErg - Intervals', 'Kardio', 'cardio_machine', true, ARRAY['ski_erg'], ARRAY['lats', 'triceps', 'core'], 'system', false),
  -- Treadmill exercises
  ('Běh - 1000m', 'Běh - 1000m', 'Run - 1000m', 'Kardio', 'cardio_machine', true, ARRAY['treadmill'], ARRAY['quadriceps', 'hamstrings', 'calves'], 'system', false),
  ('Běh - 5000m', 'Běh - 5000m', 'Run - 5000m', 'Kardio', 'cardio_machine', true, ARRAY['treadmill'], ARRAY['quadriceps', 'hamstrings', 'calves'], 'system', false),
  ('Běh - Intervaly', 'Běh - Intervaly', 'Run - Intervals', 'Kardio', 'cardio_machine', true, ARRAY['treadmill'], ARRAY['quadriceps', 'hamstrings', 'calves'], 'system', false),
  ('Běh - Chůze/Incline', 'Běh - Chůze/Incline', 'Walk/Incline', 'Kardio', 'cardio_machine', true, ARRAY['treadmill'], ARRAY['glutes', 'quadriceps', 'calves'], 'system', false)
ON CONFLICT DO NOTHING;