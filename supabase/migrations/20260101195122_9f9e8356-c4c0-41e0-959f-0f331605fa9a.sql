-- Create table for additional training participants
CREATE TABLE public.training_session_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(training_session_id, client_id)
);

-- Enable Row Level Security
ALTER TABLE public.training_session_participants ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view participants of their training sessions" 
ON public.training_session_participants 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.training_sessions ts 
    WHERE ts.id = training_session_id AND ts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add participants to their training sessions" 
ON public.training_session_participants 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.training_sessions ts 
    WHERE ts.id = training_session_id AND ts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can remove participants from their training sessions" 
ON public.training_session_participants 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.training_sessions ts 
    WHERE ts.id = training_session_id AND ts.user_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_training_session_participants_session ON public.training_session_participants(training_session_id);
CREATE INDEX idx_training_session_participants_client ON public.training_session_participants(client_id);