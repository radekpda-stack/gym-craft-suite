-- Create table for tracking section usage per client for intelligent ordering
CREATE TABLE public.client_section_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  open_count INTEGER NOT NULL DEFAULT 1,
  last_opened TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, client_id, section_id)
);

-- Enable RLS
ALTER TABLE public.client_section_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only access their own tracking data
CREATE POLICY "Users can view their own section usage"
ON public.client_section_usage
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own section usage"
ON public.client_section_usage
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own section usage"
ON public.client_section_usage
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own section usage"
ON public.client_section_usage
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for fast lookups
CREATE INDEX idx_client_section_usage_lookup 
ON public.client_section_usage(user_id, client_id);

-- Trigger for updated_at
CREATE TRIGGER update_client_section_usage_updated_at
BEFORE UPDATE ON public.client_section_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();