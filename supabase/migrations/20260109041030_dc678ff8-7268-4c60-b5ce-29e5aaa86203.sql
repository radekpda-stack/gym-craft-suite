-- Add link_method and link_confidence columns to training_feedback
ALTER TABLE public.training_feedback
ADD COLUMN IF NOT EXISTS link_method text DEFAULT 'auto' CHECK (link_method IN ('auto', 'manual', 'none')),
ADD COLUMN IF NOT EXISTS link_confidence text DEFAULT 'high' CHECK (link_confidence IN ('high', 'medium', 'low'));

-- Add comment for documentation
COMMENT ON COLUMN public.training_feedback.link_method IS 'Method used to link feedback to training: auto (system matched), manual (user selected), none (general feedback)';
COMMENT ON COLUMN public.training_feedback.link_confidence IS 'Confidence level of the training-feedback link: high (single match in window), medium (selected from multiple), low (time window exceeded)';