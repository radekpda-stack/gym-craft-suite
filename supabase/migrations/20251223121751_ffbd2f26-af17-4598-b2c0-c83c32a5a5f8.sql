-- Pre-diagnostic forms table
CREATE TABLE public.pre_diagnostic_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'draft', 'completed')),
  source TEXT NOT NULL DEFAULT 'existing_client' CHECK (source IN ('new_client', 'existing_client')),
  locked BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Pre-diagnostic answers table
CREATE TABLE public.pre_diagnostic_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.pre_diagnostic_forms(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(form_id, field_key)
);

-- Enable RLS
ALTER TABLE public.pre_diagnostic_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_diagnostic_answers ENABLE ROW LEVEL SECURITY;

-- RLS policies for pre_diagnostic_forms
-- Trainers can view their own forms
CREATE POLICY "Trainers can view their own forms" 
ON public.pre_diagnostic_forms 
FOR SELECT 
USING (auth.uid() = user_id);

-- Trainers can create forms
CREATE POLICY "Trainers can create forms" 
ON public.pre_diagnostic_forms 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Trainers can update their own forms
CREATE POLICY "Trainers can update their own forms" 
ON public.pre_diagnostic_forms 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Trainers can delete their own forms
CREATE POLICY "Trainers can delete their own forms" 
ON public.pre_diagnostic_forms 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for pre_diagnostic_answers
-- Trainers can view answers for their forms
CREATE POLICY "Trainers can view answers for their forms" 
ON public.pre_diagnostic_answers 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.pre_diagnostic_forms 
  WHERE id = form_id AND user_id = auth.uid()
));

-- Trainers can manage answers for their forms
CREATE POLICY "Trainers can insert answers for their forms" 
ON public.pre_diagnostic_answers 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.pre_diagnostic_forms 
  WHERE id = form_id AND user_id = auth.uid()
));

CREATE POLICY "Trainers can update answers for their forms" 
ON public.pre_diagnostic_answers 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.pre_diagnostic_forms 
  WHERE id = form_id AND user_id = auth.uid()
));

CREATE POLICY "Trainers can delete answers for their forms" 
ON public.pre_diagnostic_answers 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.pre_diagnostic_forms 
  WHERE id = form_id AND user_id = auth.uid()
));

-- Index for faster token lookups
CREATE INDEX idx_pre_diagnostic_forms_token ON public.pre_diagnostic_forms(token);
CREATE INDEX idx_pre_diagnostic_forms_client ON public.pre_diagnostic_forms(client_id);
CREATE INDEX idx_pre_diagnostic_forms_status ON public.pre_diagnostic_forms(status);
CREATE INDEX idx_pre_diagnostic_answers_form ON public.pre_diagnostic_answers(form_id);

-- Trigger for updated_at
CREATE TRIGGER update_pre_diagnostic_forms_updated_at
BEFORE UPDATE ON public.pre_diagnostic_forms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();