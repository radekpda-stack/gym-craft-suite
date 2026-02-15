-- Ensure views use security_invoker (not security_definer)
ALTER VIEW vw_client_ledger_balances SET (security_invoker = on);
ALTER VIEW vw_group_ledger_balances SET (security_invoker = on);