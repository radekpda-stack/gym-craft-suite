-- Red flag resolutions table
CREATE TABLE public.red_flag_resolutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_id UUID NOT NULL REFERENCES public.training_feedback(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolution_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.red_flag_resolutions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own resolutions"
ON public.red_flag_resolutions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own resolutions"
ON public.red_flag_resolutions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resolutions"
ON public.red_flag_resolutions FOR DELETE
USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_red_flag_resolutions_feedback ON public.red_flag_resolutions(feedback_id);
CREATE INDEX idx_red_flag_resolutions_client ON public.red_flag_resolutions(client_id);

-- Message log table for audit trail
CREATE TABLE public.message_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  invite_type TEXT NOT NULL, -- 'feedback' | 'pre_diagnostic' | 'nutrition'
  invite_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- 'copy' | 'email' | 'sms' | 'whatsapp'
  recipient TEXT, -- email or phone
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued', -- 'queued' | 'sent' | 'delivered' | 'failed' | 'opened'
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.message_log ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own message logs"
ON public.message_log FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own message logs"
ON public.message_log FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_message_log_invite ON public.message_log(invite_type, invite_id);
CREATE INDEX idx_message_log_client ON public.message_log(client_id);
CREATE INDEX idx_message_log_status ON public.message_log(status);