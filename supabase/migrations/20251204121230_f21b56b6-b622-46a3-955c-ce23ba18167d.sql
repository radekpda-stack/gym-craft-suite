-- Create junction table for client-tag relationship
CREATE TABLE public.client_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(client_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.client_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies based on client ownership
CREATE POLICY "Users can view client_tags for their clients"
ON public.client_tags FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = client_tags.client_id 
    AND clients.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create client_tags for their clients"
ON public.client_tags FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = client_tags.client_id 
    AND clients.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete client_tags for their clients"
ON public.client_tags FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = client_tags.client_id 
    AND clients.user_id = auth.uid()
  )
);