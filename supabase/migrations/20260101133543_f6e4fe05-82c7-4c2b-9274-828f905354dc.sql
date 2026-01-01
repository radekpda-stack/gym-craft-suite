-- Extend client_workout_logs table with new fields
ALTER TABLE public.client_workout_logs 
ADD COLUMN IF NOT EXISTS workout_type TEXT,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS energy_before INTEGER CHECK (energy_before >= 1 AND energy_before <= 5),
ADD COLUMN IF NOT EXISTS energy_after INTEGER CHECK (energy_after >= 1 AND energy_after <= 5),
ADD COLUMN IF NOT EXISTS trainer_comment TEXT,
ADD COLUMN IF NOT EXISTS trainer_commented_at TIMESTAMP WITH TIME ZONE;

-- Extend client_workout_exercises with PR flag
ALTER TABLE public.client_workout_exercises
ADD COLUMN IF NOT EXISTS is_personal_record BOOLEAN DEFAULT FALSE;

-- Create workout templates table
CREATE TABLE IF NOT EXISTS public.client_workout_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    trainer_id UUID NOT NULL,
    name TEXT NOT NULL,
    workout_type TEXT,
    exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on templates
ALTER TABLE public.client_workout_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for templates - trainers
CREATE POLICY "Trainers can manage workout templates"
ON public.client_workout_templates
FOR ALL
USING (trainer_id = auth.uid());

-- RLS policies for templates - clients
CREATE POLICY "Clients can view their own templates"
ON public.client_workout_templates
FOR SELECT
USING (client_id = public.get_client_id_for_portal_user());

CREATE POLICY "Clients can insert their own templates"
ON public.client_workout_templates
FOR INSERT
WITH CHECK (client_id = public.get_client_id_for_portal_user());

CREATE POLICY "Clients can update their own templates"
ON public.client_workout_templates
FOR UPDATE
USING (client_id = public.get_client_id_for_portal_user());

CREATE POLICY "Clients can delete their own templates"
ON public.client_workout_templates
FOR DELETE
USING (client_id = public.get_client_id_for_portal_user());

-- Create index for faster template lookups
CREATE INDEX IF NOT EXISTS idx_client_workout_templates_client_id ON public.client_workout_templates(client_id);

-- Trigger for updated_at
CREATE TRIGGER update_client_workout_templates_updated_at
BEFORE UPDATE ON public.client_workout_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();