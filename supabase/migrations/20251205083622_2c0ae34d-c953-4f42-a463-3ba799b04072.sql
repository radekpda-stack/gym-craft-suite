-- Create table for training participants with custom price splits
CREATE TABLE public.training_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  price_share NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.training_participants ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own training_participants"
ON public.training_participants FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own training_participants"
ON public.training_participants FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training_participants"
ON public.training_participants FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own training_participants"
ON public.training_participants FOR DELETE
USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_training_participants_session ON public.training_participants(training_session_id);
CREATE INDEX idx_training_participants_client ON public.training_participants(client_id);