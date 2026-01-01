-- Add time_ms (milliseconds) columns for high-precision time tracking
-- This allows storing times like 1:41.35 as 101350 ms

-- exercise_entries: main exercise logging
ALTER TABLE public.exercise_entries 
ADD COLUMN IF NOT EXISTS time_ms INTEGER;

-- Migrate existing time_seconds data to time_ms
UPDATE public.exercise_entries 
SET time_ms = time_seconds * 1000 
WHERE time_seconds IS NOT NULL AND time_ms IS NULL;

-- workout_entries: workout exercise logging  
ALTER TABLE public.workout_entries 
ADD COLUMN IF NOT EXISTS time_ms INTEGER;

UPDATE public.workout_entries 
SET time_ms = time_seconds * 1000 
WHERE time_seconds IS NOT NULL AND time_ms IS NULL;

-- cardio_entries: cardio tracking
ALTER TABLE public.cardio_entries 
ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

UPDATE public.cardio_entries 
SET duration_ms = duration_seconds * 1000 
WHERE duration_seconds IS NOT NULL AND duration_ms IS NULL;

-- training_template_exercises: template time fields
ALTER TABLE public.training_template_exercises 
ADD COLUMN IF NOT EXISTS time_ms INTEGER;

UPDATE public.training_template_exercises 
SET time_ms = time_seconds * 1000 
WHERE time_seconds IS NOT NULL AND time_ms IS NULL;

-- skill_entries: skill/drill tracking
ALTER TABLE public.skill_entries 
ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

UPDATE public.skill_entries 
SET duration_ms = duration_seconds * 1000 
WHERE duration_seconds IS NOT NULL AND duration_ms IS NULL;

-- Add indexes for time-based queries
CREATE INDEX IF NOT EXISTS idx_exercise_entries_time_ms 
ON public.exercise_entries(time_ms) WHERE time_ms IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cardio_entries_duration_ms 
ON public.cardio_entries(duration_ms) WHERE duration_ms IS NOT NULL;

-- Add comment explaining the migration
COMMENT ON COLUMN public.exercise_entries.time_ms IS 'Time in milliseconds for high-precision tracking (e.g., 101350 = 1:41.35)';
COMMENT ON COLUMN public.workout_entries.time_ms IS 'Time in milliseconds for high-precision tracking';
COMMENT ON COLUMN public.cardio_entries.duration_ms IS 'Duration in milliseconds for high-precision tracking';