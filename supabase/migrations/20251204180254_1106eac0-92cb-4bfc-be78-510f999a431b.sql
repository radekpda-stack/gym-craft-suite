-- Create junction table for training session tags
CREATE TABLE public.training_session_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(training_session_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.training_session_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can manage tags for their own training sessions
CREATE POLICY "Users can view training_session_tags for their sessions"
ON public.training_session_tags
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.training_sessions
    WHERE training_sessions.id = training_session_tags.training_session_id
    AND training_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create training_session_tags for their sessions"
ON public.training_session_tags
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.training_sessions
    WHERE training_sessions.id = training_session_tags.training_session_id
    AND training_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete training_session_tags for their sessions"
ON public.training_session_tags
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.training_sessions
    WHERE training_sessions.id = training_session_tags.training_session_id
    AND training_sessions.user_id = auth.uid()
  )
);

-- Create index for efficient queries
CREATE INDEX idx_training_session_tags_session_id ON public.training_session_tags(training_session_id);
CREATE INDEX idx_training_session_tags_tag_id ON public.training_session_tags(tag_id);