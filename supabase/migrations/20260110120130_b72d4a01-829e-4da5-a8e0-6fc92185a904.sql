-- Add height_cm column for plyometric exercises (jumps)
ALTER TABLE public.exercise_entries
ADD COLUMN IF NOT EXISTS height_cm numeric;

-- Add comment for clarity
COMMENT ON COLUMN public.exercise_entries.height_cm IS 'Height in centimeters for jump/plyometric exercises';

-- Drop old constraint and add new one with extended values
ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_default_unit_check;
ALTER TABLE exercises ADD CONSTRAINT exercises_default_unit_check 
  CHECK (default_unit = ANY (ARRAY['reps', 'seconds', 'meters', 'calories', 'cardio_machine', 'height_cm', 'distance_cm']::text[]));

-- Update supported_metrics for height-based plyometric exercises (vertical jumps)
UPDATE exercises 
SET supported_metrics = ARRAY['height_cm', 'reps', 'sets']::text[],
    default_unit = 'height_cm'
WHERE name_cs IN (
  'Skok do výšky',
  'Skok do výšky z protipohybu (CMJ)',
  'Skok z pauzy (SJ)',
  'Seskok s odrazem (DJ)',
  'Výskok na bednu',
  'Výskoky z dřepu'
);

-- Update supported_metrics for distance-based plyometric exercises (horizontal jumps)
UPDATE exercises 
SET supported_metrics = ARRAY['distance_cm', 'reps', 'sets']::text[],
    default_unit = 'distance_cm'
WHERE name_cs IN (
  'Skok do dálky',
  'Skok do dálky z místa',
  'Jednoskok do dálky',
  'Skok z jedné nohy'
);

-- Update remaining plyometric exercises to use reps (ankle hops, etc.)
UPDATE exercises 
SET supported_metrics = ARRAY['reps', 'sets', 'time_seconds']::text[]
WHERE category = 'plyometrics' 
  AND name_cs NOT IN (
    'Skok do výšky', 'Skok do výšky z protipohybu (CMJ)', 'Skok z pauzy (SJ)',
    'Seskok s odrazem (DJ)', 'Výskok na bednu', 'Výskoky z dřepu',
    'Skok do dálky', 'Skok do dálky z místa', 'Jednoskok do dálky', 'Skok z jedné nohy'
  );