
-- Fix SECURITY DEFINER views by dropping and recreating as SECURITY INVOKER
-- Views should use the caller's permissions, not the creator's

DROP VIEW IF EXISTS public.vw_client_ledger_balances;
DROP VIEW IF EXISTS public.vw_group_ledger_balances;

-- 1. VIEW: Client balances (SECURITY INVOKER - uses caller's RLS)
CREATE VIEW public.vw_client_ledger_balances 
WITH (security_invoker = true)
AS
SELECT 
  c.id as client_id,
  c.name as client_name,
  c.credit_balance as stored_balance,
  COALESCE(SUM(ct.amount) FILTER (WHERE ct.group_id IS NULL AND ct.status = 'completed'), 0) as ledger_balance,
  c.credit_balance - COALESCE(SUM(ct.amount) FILTER (WHERE ct.group_id IS NULL AND ct.status = 'completed'), 0) as discrepancy,
  EXISTS (SELECT 1 FROM client_budget_members bm WHERE bm.client_id = c.id) as is_group_member
FROM clients c
LEFT JOIN credit_transactions ct ON ct.client_id = c.id
WHERE c.is_archived = false
GROUP BY c.id, c.name, c.credit_balance;

-- 2. VIEW: Group balances (SECURITY INVOKER - uses caller's RLS)
CREATE VIEW public.vw_group_ledger_balances 
WITH (security_invoker = true)
AS
SELECT 
  bg.id as group_id,
  bg.name as group_name,
  bg.shared_balance as stored_balance,
  COALESCE(SUM(ct.amount) FILTER (WHERE ct.status = 'completed'), 0) as ledger_balance,
  bg.shared_balance - COALESCE(SUM(ct.amount) FILTER (WHERE ct.status = 'completed'), 0) as discrepancy,
  (SELECT COUNT(*) FROM client_budget_members bm WHERE bm.group_id = bg.id) as member_count
FROM client_budget_groups bg
LEFT JOIN credit_transactions ct ON ct.group_id = bg.id
GROUP BY bg.id, bg.name, bg.shared_balance;

-- Grant permissions
GRANT SELECT ON public.vw_client_ledger_balances TO authenticated;
GRANT SELECT ON public.vw_group_ledger_balances TO authenticated;
