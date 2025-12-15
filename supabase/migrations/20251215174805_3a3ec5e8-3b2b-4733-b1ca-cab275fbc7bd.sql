-- Add 'transfer' type to credit_transactions for debt transfers between personal and shared budgets
ALTER TABLE public.credit_transactions 
DROP CONSTRAINT IF EXISTS credit_transactions_type_check;

ALTER TABLE public.credit_transactions 
ADD CONSTRAINT credit_transactions_type_check 
CHECK (type IN ('payment', 'training', 'product', 'manual', 'canceled_training', 'transfer', 'training_deduction'));