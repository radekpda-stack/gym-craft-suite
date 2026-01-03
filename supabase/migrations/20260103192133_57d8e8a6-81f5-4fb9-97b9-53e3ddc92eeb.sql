-- Create table for client name aliases/nicknames
CREATE TABLE public.client_name_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  source TEXT DEFAULT 'manual', -- 'manual', 'learned'
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL,
  UNIQUE(client_id, alias)
);

-- Enable RLS
ALTER TABLE public.client_name_aliases ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own client aliases"
  ON public.client_name_aliases FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own client aliases"
  ON public.client_name_aliases FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own client aliases"
  ON public.client_name_aliases FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own client aliases"
  ON public.client_name_aliases FOR DELETE
  USING (user_id = auth.uid());

-- Add match_suggestions column to calendar_ics_events
ALTER TABLE public.calendar_ics_events 
ADD COLUMN match_suggestions JSONB DEFAULT '[]'::jsonb;

-- Add index for faster alias lookups
CREATE INDEX idx_client_name_aliases_client_id ON public.client_name_aliases(client_id);
CREATE INDEX idx_client_name_aliases_alias ON public.client_name_aliases(lower(alias));