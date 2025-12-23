-- Add tracking for trainer edits to pre_diagnostic_answers
ALTER TABLE public.pre_diagnostic_answers
ADD COLUMN IF NOT EXISTS original_value JSONB,
ADD COLUMN IF NOT EXISTS edited_by_trainer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;

-- Add trainer summary and approval to pre_diagnostic_forms
ALTER TABLE public.pre_diagnostic_forms
ADD COLUMN IF NOT EXISTS trainer_summary TEXT,
ADD COLUMN IF NOT EXISTS trainer_recommendations TEXT,
ADD COLUMN IF NOT EXISTS trainer_restrictions TEXT,
ADD COLUMN IF NOT EXISTS summary_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Create table for tracking answer history (optional but useful)
CREATE TABLE IF NOT EXISTS public.pre_diagnostic_answer_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  answer_id UUID NOT NULL REFERENCES public.pre_diagnostic_answers(id) ON DELETE CASCADE,
  previous_value JSONB NOT NULL,
  new_value JSONB NOT NULL,
  changed_by TEXT DEFAULT 'trainer',
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on history table
ALTER TABLE public.pre_diagnostic_answer_history ENABLE ROW LEVEL SECURITY;

-- RLS policy for history - trainers can view history of their forms
CREATE POLICY "Trainers can view answer history" 
ON public.pre_diagnostic_answer_history 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.pre_diagnostic_answers a
  JOIN public.pre_diagnostic_forms f ON a.form_id = f.id
  WHERE a.id = answer_id AND f.user_id = auth.uid()
));

-- RLS policy for inserting history
CREATE POLICY "Trainers can insert answer history" 
ON public.pre_diagnostic_answer_history 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.pre_diagnostic_answers a
  JOIN public.pre_diagnostic_forms f ON a.form_id = f.id
  WHERE a.id = answer_id AND f.user_id = auth.uid()
));

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pre_diagnostic_answer_history_answer 
ON public.pre_diagnostic_answer_history(answer_id);