
-- Step 1: Drop duplicate delta-based triggers (keep only SUM-based trg_sync_client_credit_balance)
DROP TRIGGER IF EXISTS sync_balance_after_transaction ON public.credit_transactions;
DROP TRIGGER IF EXISTS trg_sync_balance_on_transaction ON public.credit_transactions;

-- Step 2: Drop the delta function (no longer needed)
DROP FUNCTION IF EXISTS public.trg_sync_balance_on_transaction();

-- Step 3: Reconcile ALL client balances from ledger SUM
UPDATE public.clients c
SET credit_balance = COALESCE(sub.total, 0)
FROM (
  SELECT client_id, SUM(amount) AS total
  FROM public.credit_transactions
  GROUP BY client_id
) sub
WHERE c.id = sub.client_id
  AND c.credit_balance IS DISTINCT FROM COALESCE(sub.total, 0);

-- Also fix clients with no transactions (should be 0)
UPDATE public.clients
SET credit_balance = 0
WHERE id NOT IN (SELECT DISTINCT client_id FROM public.credit_transactions)
  AND credit_balance != 0;

-- Step 4: Reconcile ALL group balances from ledger SUM
UPDATE public.client_budget_groups g
SET shared_balance = COALESCE(sub.total, 0)
FROM (
  SELECT group_id, SUM(amount) AS total
  FROM public.credit_transactions
  WHERE group_id IS NOT NULL
  GROUP BY group_id
) sub
WHERE g.id = sub.group_id
  AND g.shared_balance IS DISTINCT FROM COALESCE(sub.total, 0);
