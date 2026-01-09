-- Add cancellation_reason column to training_sessions
ALTER TABLE public.training_sessions 
ADD COLUMN cancellation_reason TEXT DEFAULT NULL;