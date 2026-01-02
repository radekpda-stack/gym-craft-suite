-- Add is_self_service column to track client-initiated campaigns
ALTER TABLE public.nutrition_log_sessions 
ADD COLUMN IF NOT EXISTS is_self_service BOOLEAN DEFAULT false;

-- Create meal templates table for clients
CREATE TABLE public.nutrition_meal_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  description TEXT NOT NULL,
  portion_size TEXT CHECK (portion_size IN ('small', 'medium', 'large')),
  quality TEXT CHECK (quality IN ('good', 'normal', 'poor')),
  note TEXT,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nutrition_meal_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for meal templates
CREATE POLICY "Clients can view their own templates"
ON public.nutrition_meal_templates
FOR SELECT
USING (true);

CREATE POLICY "Clients can create their own templates"
ON public.nutrition_meal_templates
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Clients can update their own templates"
ON public.nutrition_meal_templates
FOR UPDATE
USING (true);

CREATE POLICY "Clients can delete their own templates"
ON public.nutrition_meal_templates
FOR DELETE
USING (true);

-- Index for faster lookups
CREATE INDEX idx_nutrition_meal_templates_client_id ON public.nutrition_meal_templates(client_id);
CREATE INDEX idx_nutrition_meal_templates_use_count ON public.nutrition_meal_templates(use_count DESC);