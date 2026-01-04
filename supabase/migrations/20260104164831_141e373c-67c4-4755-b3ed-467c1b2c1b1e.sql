-- Create table for form/feedback field analytics
CREATE TABLE public.form_field_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL, -- 'feedback', 'diagnostic', 'measurement', 'onboarding', 'nutrition', etc.
  form_instance_id UUID, -- e.g. feedback_request_id, diagnostic_id, etc.
  session_id TEXT, -- browser session to group interactions
  
  -- Form-level metrics
  form_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  form_completed_at TIMESTAMP WITH TIME ZONE,
  form_abandoned_at TIMESTAMP WITH TIME ZONE,
  total_time_seconds INTEGER, -- total time from start to completion
  
  -- Field-level aggregated data
  fields_data JSONB DEFAULT '[]'::jsonb, -- array of {field_name, time_spent_ms, interactions, validation_errors, was_skipped}
  
  -- Aggregated stats
  total_fields INTEGER DEFAULT 0,
  completed_fields INTEGER DEFAULT 0,
  skipped_fields INTEGER DEFAULT 0,
  validation_error_count INTEGER DEFAULT 0,
  
  -- Device/context info
  device_type TEXT, -- 'mobile', 'tablet', 'desktop'
  viewport_width INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.form_field_analytics ENABLE ROW LEVEL SECURITY;

-- Policies for trainers (user_id based)
CREATE POLICY "Users can view their own form analytics"
ON public.form_field_analytics
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own form analytics"
ON public.form_field_analytics
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own form analytics"
ON public.form_field_analytics
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy for client portal (via client_id matching client_accounts)
CREATE POLICY "Clients can insert form analytics via portal"
ON public.form_field_analytics
FOR INSERT
WITH CHECK (
  client_id IN (
    SELECT ca.client_id 
    FROM public.client_accounts ca 
    WHERE ca.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Clients can update form analytics via portal"
ON public.form_field_analytics
FOR UPDATE
USING (
  client_id IN (
    SELECT ca.client_id 
    FROM public.client_accounts ca 
    WHERE ca.auth_user_id = auth.uid()
  )
);

-- Index for common queries
CREATE INDEX idx_form_field_analytics_user_id ON public.form_field_analytics(user_id);
CREATE INDEX idx_form_field_analytics_client_id ON public.form_field_analytics(client_id);
CREATE INDEX idx_form_field_analytics_form_type ON public.form_field_analytics(form_type);
CREATE INDEX idx_form_field_analytics_created_at ON public.form_field_analytics(created_at);

-- Trigger for updated_at
CREATE TRIGGER update_form_field_analytics_updated_at
BEFORE UPDATE ON public.form_field_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();