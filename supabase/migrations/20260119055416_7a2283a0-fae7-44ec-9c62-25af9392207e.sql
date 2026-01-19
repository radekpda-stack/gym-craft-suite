-- Update clients.credit_balance to match the actual ledger balance
-- For clients with credit_history_start_at, only count transactions after that date
-- For clients without, count all transactions

WITH ledger_balances AS (
  SELECT 
    ct.client_id,
    COALESCE(SUM(ct.amount), 0) AS calculated_balance
  FROM credit_transactions ct
  LEFT JOIN client_accounts ca ON ct.client_id = ca.client_id
  WHERE ct.status != 'cancelled'
    AND (
      ca.credit_history_start_at IS NULL 
      OR ct.created_at >= ca.credit_history_start_at
    )
  GROUP BY ct.client_id
)
UPDATE clients c
SET credit_balance = COALESCE(lb.calculated_balance, 0),
    updated_at = now()
FROM ledger_balances lb
WHERE c.id = lb.client_id
  AND c.credit_balance IS DISTINCT FROM COALESCE(lb.calculated_balance, 0);