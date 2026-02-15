-- Fix vw_client_ledger_balances to use balance_after from latest transaction
-- This matches the useCreditBalance hook logic and prevents discrepancies
CREATE OR REPLACE VIEW vw_client_ledger_balances AS
SELECT 
  c.id AS client_id,
  c.name AS client_name,
  c.credit_balance AS stored_balance,
  COALESCE(
    (SELECT ct.balance_after 
     FROM credit_transactions ct 
     WHERE ct.client_id = c.id 
       AND ct.group_id IS NULL 
       AND ct.status = 'completed' 
       AND ct.balance_after IS NOT NULL
     ORDER BY ct.created_at DESC, ct.id DESC 
     LIMIT 1),
    0
  ) AS ledger_balance,
  c.credit_balance - COALESCE(
    (SELECT ct.balance_after 
     FROM credit_transactions ct 
     WHERE ct.client_id = c.id 
       AND ct.group_id IS NULL 
       AND ct.status = 'completed' 
       AND ct.balance_after IS NOT NULL
     ORDER BY ct.created_at DESC, ct.id DESC 
     LIMIT 1),
    0
  ) AS discrepancy,
  EXISTS (
    SELECT 1 FROM client_budget_members bm WHERE bm.client_id = c.id
  ) AS is_group_member
FROM clients c
WHERE c.is_archived = false;

-- Fix vw_group_ledger_balances to use balance_after from latest transaction
CREATE OR REPLACE VIEW vw_group_ledger_balances AS
SELECT 
  bg.id AS group_id,
  bg.name AS group_name,
  bg.shared_balance AS stored_balance,
  COALESCE(
    (SELECT ct.balance_after 
     FROM credit_transactions ct 
     WHERE ct.group_id = bg.id 
       AND ct.status = 'completed' 
       AND ct.balance_after IS NOT NULL
     ORDER BY ct.created_at DESC, ct.id DESC 
     LIMIT 1),
    0
  ) AS ledger_balance,
  bg.shared_balance - COALESCE(
    (SELECT ct.balance_after 
     FROM credit_transactions ct 
     WHERE ct.group_id = bg.id 
       AND ct.status = 'completed' 
       AND ct.balance_after IS NOT NULL
     ORDER BY ct.created_at DESC, ct.id DESC 
     LIMIT 1),
    0
  ) AS discrepancy,
  (SELECT count(*) FROM client_budget_members bm WHERE bm.group_id = bg.id) AS member_count
FROM client_budget_groups bg;