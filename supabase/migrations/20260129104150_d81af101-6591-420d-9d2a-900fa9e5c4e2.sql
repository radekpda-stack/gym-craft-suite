-- Add trainer_note column to training_feedback table for private trainer comments
ALTER TABLE training_feedback 
ADD COLUMN IF NOT EXISTS trainer_note TEXT;

-- Add comment for documentation
COMMENT ON COLUMN training_feedback.trainer_note IS 'Private trainer note about the feedback (not visible to client)';