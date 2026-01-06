-- Add price transition columns to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS grandfathered_credit numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS grandfathered_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS use_legacy_pricing boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.clients.grandfathered_credit IS 'Credit balance at the time of price transition - client pays old prices until this is exhausted';
COMMENT ON COLUMN public.clients.grandfathered_at IS 'Timestamp when the grandfathered credit was recorded';
COMMENT ON COLUMN public.clients.use_legacy_pricing IS 'Whether client is currently using legacy (old) pricing';