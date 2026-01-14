-- Create training_followups table for follow-up notes
CREATE TABLE public.training_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_session_id UUID REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  followup_type TEXT DEFAULT 'general' CHECK (followup_type IN ('pain', 'technique', 'goal', 'general')),
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_in_training_id UUID REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.training_followups ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own followups"
ON public.training_followups FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own followups"
ON public.training_followups FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own followups"
ON public.training_followups FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own followups"
ON public.training_followups FOR DELETE
USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_training_followups_client_id ON public.training_followups(client_id);
CREATE INDEX idx_training_followups_user_id ON public.training_followups(user_id);
CREATE INDEX idx_training_followups_is_resolved ON public.training_followups(is_resolved);