-- Sprint 1: Add in_progress status and session_notes field

-- First, check if session_notes column exists and add it if not
ALTER TABLE training_sessions 
ADD COLUMN IF NOT EXISTS session_notes text;

-- Add comment for documentation
COMMENT ON COLUMN training_sessions.session_notes IS 'Notes recorded during the training session (technique, pain, fatigue, trainer observations)';

-- Note: The status field uses text with a check constraint, we need to update it to allow 'in_progress'
-- First drop the existing constraint if it exists
DO $$ 
BEGIN
  ALTER TABLE training_sessions DROP CONSTRAINT IF EXISTS training_sessions_status_check;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Now add the new constraint that includes 'in_progress'
ALTER TABLE training_sessions 
ADD CONSTRAINT training_sessions_status_check 
CHECK (status IN ('scheduled', 'in_progress', 'completed', 'canceled'));