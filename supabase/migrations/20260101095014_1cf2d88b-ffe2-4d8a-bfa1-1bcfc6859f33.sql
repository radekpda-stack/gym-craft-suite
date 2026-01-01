-- Add new fields for enhanced feedback system
-- Phase 1: Extend training_feedback table

-- Feedback type (post_session vs morning_after)
ALTER TABLE training_feedback ADD COLUMN IF NOT EXISTS
  feedback_type TEXT DEFAULT 'post_session';

-- Limiting factor (what held back the session)
ALTER TABLE training_feedback ADD COLUMN IF NOT EXISTS
  limiting_factor TEXT;

-- Pain timing (when pain occurred)
ALTER TABLE training_feedback ADD COLUMN IF NOT EXISTS
  pain_timing TEXT;

-- DOMS level for morning-after feedback (0-10)
ALTER TABLE training_feedback ADD COLUMN IF NOT EXISTS
  doms_level INTEGER;

-- Readiness level for morning-after feedback (1-10)
ALTER TABLE training_feedback ADD COLUMN IF NOT EXISTS
  readiness_level INTEGER;

-- Enjoyment level (optional, 1-10)
ALTER TABLE training_feedback ADD COLUMN IF NOT EXISTS
  enjoyment_level INTEGER;

-- Session fit (how well the training matched expectations, 1-10)
ALTER TABLE training_feedback ADD COLUMN IF NOT EXISTS
  session_fit INTEGER;

-- Add trainer internal note to training_sessions
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS
  trainer_internal_note TEXT;

-- Add computed red_flag_reasons array for quick filtering
ALTER TABLE training_feedback ADD COLUMN IF NOT EXISTS
  red_flag_reasons TEXT[];

-- Create index for red flag filtering
CREATE INDEX IF NOT EXISTS idx_training_feedback_red_flags 
  ON training_feedback USING GIN (red_flag_reasons)
  WHERE red_flag_reasons IS NOT NULL AND array_length(red_flag_reasons, 1) > 0;

-- Create index for feedback type filtering
CREATE INDEX IF NOT EXISTS idx_training_feedback_type 
  ON training_feedback (feedback_type);

-- Comment on new columns for documentation
COMMENT ON COLUMN training_feedback.feedback_type IS 'Type of feedback: post_session (immediate) or morning_after (next day)';
COMMENT ON COLUMN training_feedback.limiting_factor IS 'What limited the session: cardio_breath, strength, technique, pain_joint, motivation, none';
COMMENT ON COLUMN training_feedback.pain_timing IS 'When pain occurred: during, after, evening';
COMMENT ON COLUMN training_feedback.doms_level IS 'Delayed onset muscle soreness level 0-10 (morning_after only)';
COMMENT ON COLUMN training_feedback.readiness_level IS 'Training readiness level 1-10 (morning_after only)';
COMMENT ON COLUMN training_feedback.enjoyment_level IS 'How much client enjoyed the session 1-10';
COMMENT ON COLUMN training_feedback.session_fit IS 'How well the training matched expectations 1-10';
COMMENT ON COLUMN training_feedback.red_flag_reasons IS 'Array of triggered red flag reason codes';
COMMENT ON COLUMN training_sessions.trainer_internal_note IS 'Internal note from trainer about this session';