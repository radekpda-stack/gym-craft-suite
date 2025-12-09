-- Add payment fields to training_sessions table
ALTER TABLE public.training_sessions 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS final_price numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.training_sessions.payment_status IS 'Payment status: pending, unpaid, paid_credit, paid_cash, paid_card, paid_bank';
COMMENT ON COLUMN public.training_sessions.final_price IS 'Final price for the training session';
COMMENT ON COLUMN public.training_sessions.payment_method IS 'Payment method used: credit, cash, card, bank';