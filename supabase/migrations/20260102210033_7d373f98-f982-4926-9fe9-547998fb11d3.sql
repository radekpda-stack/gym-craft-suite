-- Fix: Allow 'portal' as a valid source value for training feedback
-- This fixes the constraint violation when submitting feedback from client portal

ALTER TABLE training_feedback 
DROP CONSTRAINT training_feedback_source_check;

ALTER TABLE training_feedback 
ADD CONSTRAINT training_feedback_source_check 
CHECK (source = ANY (ARRAY['manual', 'email', 'link', 'portal']));