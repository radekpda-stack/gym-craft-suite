-- Add shared_balance to client_budget_groups
ALTER TABLE public.client_budget_groups 
ADD COLUMN IF NOT EXISTS shared_balance NUMERIC DEFAULT 0;

-- Add group_id to credit_transactions for tracking group transactions
ALTER TABLE public.credit_transactions 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.client_budget_groups(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_credit_transactions_group_id ON public.credit_transactions(group_id);

-- Update existing groups with calculated shared_balance from member credit_balances
-- Take the average of member balances as initial shared balance
UPDATE public.client_budget_groups g
SET shared_balance = COALESCE((
  SELECT AVG(c.credit_balance)
  FROM public.client_budget_members m
  JOIN public.clients c ON c.id = m.client_id
  WHERE m.group_id = g.id
), 0);