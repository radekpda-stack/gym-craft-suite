-- Synchronize credit_balance with ledger for all individual clients (not in shared budgets)
-- This is a one-time data fix to ensure stored balances match transaction history

UPDATE clients c
SET 
  credit_balance = COALESCE(
    (SELECT SUM(amount) 
     FROM credit_transactions 
     WHERE client_id = c.id),
    0
  ),
  updated_at = now()
WHERE NOT EXISTS (
  SELECT 1 FROM client_budget_members WHERE client_id = c.id
);