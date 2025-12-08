-- Add payment_method column to credit_transactions for distinguishing payment types
ALTER TABLE public.credit_transactions
ADD COLUMN payment_method TEXT DEFAULT 'credit';

-- Add comment for clarity
COMMENT ON COLUMN public.credit_transactions.payment_method IS 'Payment method: cash, credit, card';

-- Create index for filtering by payment method
CREATE INDEX idx_credit_transactions_payment_method ON public.credit_transactions(payment_method);