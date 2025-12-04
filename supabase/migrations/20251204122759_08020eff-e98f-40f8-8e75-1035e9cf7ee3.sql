-- Add is_favorite column to clients table
ALTER TABLE public.clients 
ADD COLUMN is_favorite boolean NOT NULL DEFAULT false;

-- Add recurrence fields to training_sessions table
ALTER TABLE public.training_sessions 
ADD COLUMN recurrence_type text DEFAULT NULL,
ADD COLUMN recurrence_end_date date DEFAULT NULL,
ADD COLUMN parent_session_id uuid DEFAULT NULL REFERENCES public.training_sessions(id) ON DELETE SET NULL;

-- Create index for faster favorite lookups
CREATE INDEX idx_clients_is_favorite ON public.clients(is_favorite) WHERE is_favorite = true;

-- Create index for recurrence lookups
CREATE INDEX idx_training_sessions_parent ON public.training_sessions(parent_session_id) WHERE parent_session_id IS NOT NULL;