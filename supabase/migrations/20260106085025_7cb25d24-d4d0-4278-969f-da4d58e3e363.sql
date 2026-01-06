-- Add prepaid budget threshold for custom pricing
ALTER TABLE public.clients 
ADD COLUMN custom_price_credit_limit numeric DEFAULT NULL;

COMMENT ON COLUMN public.clients.custom_price_credit_limit IS 'Credit threshold - when credit drops to/below this value, custom pricing is exhausted and user is notified';