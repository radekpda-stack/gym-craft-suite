-- Add source and status columns to exercise_entries for off-session performance logging
ALTER TABLE exercise_entries 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'training_session',
ADD COLUMN IF NOT EXISTS status text DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS verified_by_user_id uuid,
ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Add comment for source enum values
COMMENT ON COLUMN exercise_entries.source IS 'training_session | coach_manual | client_self_report | import | challenge_manual';
COMMENT ON COLUMN exercise_entries.status IS 'approved | pending | rejected';

-- Add exercise_id and fixed_distance_m to challenges for proper exercise linking
ALTER TABLE challenges
ADD COLUMN IF NOT EXISTS exercise_id uuid REFERENCES exercises(id),
ADD COLUMN IF NOT EXISTS fixed_distance_m numeric,
ADD COLUMN IF NOT EXISTS fixed_time_s integer;

-- Create index for efficient filtering by source and status
CREATE INDEX IF NOT EXISTS idx_exercise_entries_source_status ON exercise_entries(source, status);

-- Create index for challenge-exercise lookup
CREATE INDEX IF NOT EXISTS idx_challenges_exercise_id ON challenges(exercise_id) WHERE exercise_id IS NOT NULL;

-- Update existing exercise_entries to have correct default values
UPDATE exercise_entries 
SET source = 'training_session', status = 'approved' 
WHERE source IS NULL OR status IS NULL;