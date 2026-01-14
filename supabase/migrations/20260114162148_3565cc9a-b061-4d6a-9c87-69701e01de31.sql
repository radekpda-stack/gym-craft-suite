-- Add priority column to training_followups
ALTER TABLE public.training_followups 
ADD COLUMN priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low'));

-- Add exercise_id column for linking to specific exercise
ALTER TABLE public.training_followups 
ADD COLUMN exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL;

-- Add index for priority queries
CREATE INDEX idx_training_followups_priority ON public.training_followups(priority);