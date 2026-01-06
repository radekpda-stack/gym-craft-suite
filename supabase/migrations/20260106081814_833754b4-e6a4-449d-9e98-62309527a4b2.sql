-- Add payment_method column to training_participants table
-- This allows each participant to have their own payment method
ALTER TABLE public.training_participants 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.training_participants.payment_method IS 'Individual payment method for this participant: credit, cash, card, bank, pending';