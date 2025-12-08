-- Create feedback_requests table for tracking email-based feedback requests
CREATE TABLE public.feedback_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  training_session_id UUID REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'completed', 'expired', 'cancelled')),
  custom_message TEXT,
  trainer_signature TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '48 hours'),
  sent_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  reminder_count INTEGER DEFAULT 0,
  last_reminder_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own feedback_requests" 
ON public.feedback_requests FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own feedback_requests" 
ON public.feedback_requests FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback_requests" 
ON public.feedback_requests FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feedback_requests" 
ON public.feedback_requests FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_feedback_requests_updated_at
BEFORE UPDATE ON public.feedback_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add columns to training_feedback for tracking source and request
ALTER TABLE public.training_feedback 
ADD COLUMN IF NOT EXISTS feedback_request_id UUID REFERENCES public.feedback_requests(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'email', 'link')),
ADD COLUMN IF NOT EXISTS is_processed BOOLEAN DEFAULT false;

-- Create index for faster lookups
CREATE INDEX idx_feedback_requests_token ON public.feedback_requests(token);
CREATE INDEX idx_feedback_requests_client ON public.feedback_requests(client_id);
CREATE INDEX idx_feedback_requests_status ON public.feedback_requests(status);

-- Add feedback settings table
CREATE TABLE public.feedback_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  reminder_intervals INTEGER[] DEFAULT '{3600, 10800, 86400}', -- 1h, 3h, 24h in seconds
  expiration_hours INTEGER DEFAULT 48,
  default_language TEXT DEFAULT 'cs',
  trainer_signature TEXT,
  auto_send_after_training BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on feedback_settings
ALTER TABLE public.feedback_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for feedback_settings
CREATE POLICY "Users can view their own feedback_settings" 
ON public.feedback_settings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own feedback_settings" 
ON public.feedback_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback_settings" 
ON public.feedback_settings FOR UPDATE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_feedback_settings_updated_at
BEFORE UPDATE ON public.feedback_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();