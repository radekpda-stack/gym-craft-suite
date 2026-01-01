-- Add training_start_date field to clients table
-- This tracks when client started training ("chodí od")
-- Falls back to created_at if not set

ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS training_start_date DATE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_clients_training_start_date 
ON public.clients(training_start_date);

-- Add comment for documentation
COMMENT ON COLUMN public.clients.training_start_date IS 'Date when client started training. Falls back to created_at if null.';