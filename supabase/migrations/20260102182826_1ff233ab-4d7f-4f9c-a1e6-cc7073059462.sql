-- Update training_feedback constraints for more flexibility

-- Drop restrictive constraints
ALTER TABLE public.training_feedback 
DROP CONSTRAINT IF EXISTS training_feedback_pain_type_check;

ALTER TABLE public.training_feedback 
DROP CONSTRAINT IF EXISTS training_feedback_comment_check;

-- Add updated constraints with more flexibility
ALTER TABLE public.training_feedback 
ADD CONSTRAINT training_feedback_pain_type_check 
CHECK (pain_type IS NULL OR pain_type IN ('muscle', 'joint', 'tendon'));

ALTER TABLE public.training_feedback 
ADD CONSTRAINT training_feedback_comment_check 
CHECK (comment IS NULL OR char_length(comment) <= 500);