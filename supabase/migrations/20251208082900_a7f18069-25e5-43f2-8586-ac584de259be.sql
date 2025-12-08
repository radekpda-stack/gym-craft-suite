-- Add training_type and secondary_muscle_groups to exercises table
ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS training_type text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS secondary_muscle_groups text[] DEFAULT '{}'::text[];

-- Add training_phase to exercise_entries for periodization tracking
ALTER TABLE public.exercise_entries 
ADD COLUMN IF NOT EXISTS training_phase text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS training_type text DEFAULT NULL;

-- Create client_training_phases table for tracking periodization blocks
CREATE TABLE IF NOT EXISTS public.client_training_phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  phase_name text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  notes text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on client_training_phases
ALTER TABLE public.client_training_phases ENABLE ROW LEVEL SECURITY;

-- RLS policies for client_training_phases
CREATE POLICY "Users can view their own training phases" 
ON public.client_training_phases 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own training phases" 
ON public.client_training_phases 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training phases" 
ON public.client_training_phases 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own training phases" 
ON public.client_training_phases 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_client_training_phases_updated_at
BEFORE UPDATE ON public.client_training_phases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();