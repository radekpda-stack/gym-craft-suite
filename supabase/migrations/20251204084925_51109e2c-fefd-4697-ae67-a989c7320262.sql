-- Add diagnostic_id column to client_media table
ALTER TABLE public.client_media 
ADD COLUMN diagnostic_id UUID REFERENCES public.diagnostics(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX idx_client_media_diagnostic_id ON public.client_media(diagnostic_id);