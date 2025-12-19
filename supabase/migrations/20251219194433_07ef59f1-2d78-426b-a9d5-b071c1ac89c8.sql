-- Add new columns to training_sessions for pre/post training notes
ALTER TABLE public.training_sessions 
ADD COLUMN IF NOT EXISTS prep_notes TEXT,
ADD COLUMN IF NOT EXISTS pain_reported BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pain_notes TEXT;

-- Add new columns to workout_entries for different measurement types and PR marking
ALTER TABLE public.workout_entries 
ADD COLUMN IF NOT EXISTS time_seconds INTEGER,
ADD COLUMN IF NOT EXISTS distance_meters NUMERIC,
ADD COLUMN IF NOT EXISTS calories INTEGER,
ADD COLUMN IF NOT EXISTS watts INTEGER,
ADD COLUMN IF NOT EXISTS is_pr BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN public.training_sessions.prep_notes IS 'Notes prepared before the training session';
COMMENT ON COLUMN public.training_sessions.pain_reported IS 'Whether client reported pain after training';
COMMENT ON COLUMN public.training_sessions.pain_notes IS 'Details about reported pain';
COMMENT ON COLUMN public.workout_entries.time_seconds IS 'Time in seconds for time-based exercises';
COMMENT ON COLUMN public.workout_entries.distance_meters IS 'Distance in meters for distance-based exercises';
COMMENT ON COLUMN public.workout_entries.calories IS 'Calories burned for cardio exercises';
COMMENT ON COLUMN public.workout_entries.watts IS 'Power output in watts';
COMMENT ON COLUMN public.workout_entries.is_pr IS 'Manually marked personal record';