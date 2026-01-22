-- Fix search_path security warnings for new functions
ALTER FUNCTION trg_on_member_added_to_group() SET search_path = public;
ALTER FUNCTION rpc_recalculate_client_balance(uuid) SET search_path = public;
ALTER FUNCTION rpc_recalculate_group_balance(uuid) SET search_path = public;
ALTER FUNCTION rpc_recalculate_all_balances() SET search_path = public;
ALTER FUNCTION rpc_get_balance_discrepancies() SET search_path = public;