-- Add gender column to clients table
ALTER TABLE public.clients 
ADD COLUMN gender text CHECK (gender IN ('male', 'female'));

-- Add comment for clarity
COMMENT ON COLUMN public.clients.gender IS 'Client gender: male or female';