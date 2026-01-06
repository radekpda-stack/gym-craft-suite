-- Add custom pricing columns to clients table
ALTER TABLE public.clients 
ADD COLUMN custom_training_price numeric DEFAULT NULL,
ADD COLUMN custom_price_note text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.clients.custom_training_price IS 'Custom training price for this client (overrides global pricing when set)';
COMMENT ON COLUMN public.clients.custom_price_note IS 'Note explaining why custom price is set (e.g., "Předplaceno do 03/2025")';