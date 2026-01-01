
-- ============================================================
-- CREDIT BALANCE VIEWS & FUNCTIONS
-- Server-side source of truth for credit calculations
-- ============================================================

-- 1. VIEW: Client balances (for individual clients NOT in groups)
CREATE OR REPLACE VIEW public.vw_client_ledger_balances AS
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

-- 2. VIEW: Group balances (for budget groups)
CREATE OR REPLACE VIEW public.vw_group_ledger_balances AS
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

-- 3. RPC: Get client effective balance (personal or group)
CREATE OR REPLACE FUNCTION public.rpc_get_effective_balance(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
  v_group_name text;
  v_balance numeric;
  v_is_group_member boolean := false;
BEGIN
  -- Check if client is in a budget group
  SELECT bm.group_id, bg.name, bg.shared_balance
  INTO v_group_id, v_group_name, v_balance
  FROM client_budget_members bm
  JOIN client_budget_groups bg ON bg.id = bm.group_id
  WHERE bm.client_id = p_client_id;
  
  IF v_group_id IS NOT NULL THEN
    v_is_group_member := true;
  ELSE
    -- Get individual balance
    SELECT credit_balance INTO v_balance
    FROM clients
    WHERE id = p_client_id;
  END IF;
  
  RETURN jsonb_build_object(
    'client_id', p_client_id,
    'is_group_member', v_is_group_member,
    'group_id', v_group_id,
    'group_name', v_group_name,
    'balance', COALESCE(v_balance, 0),
    'source', CASE WHEN v_is_group_member THEN 'group' ELSE 'client' END
  );
END;
$$;

-- 4. RPC: Audit all balances (for admin debugging)
CREATE OR REPLACE FUNCTION public.rpc_audit_all_balances()
RETURNS TABLE(
  entity_type text,
  entity_id uuid,
  entity_name text,
  stored_balance numeric,
  ledger_balance numeric,
  discrepancy numeric,
  needs_fix boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Individual clients (not in groups)
  RETURN QUERY
  SELECT 
    'client'::text as entity_type,
    c.id as entity_id,
    c.name as entity_name,
    COALESCE(c.credit_balance, 0) as stored_balance,
    COALESCE(SUM(ct.amount) FILTER (WHERE ct.group_id IS NULL AND ct.status = 'completed'), 0) as ledger_balance,
    COALESCE(c.credit_balance, 0) - COALESCE(SUM(ct.amount) FILTER (WHERE ct.group_id IS NULL AND ct.status = 'completed'), 0) as discrepancy,
    ABS(COALESCE(c.credit_balance, 0) - COALESCE(SUM(ct.amount) FILTER (WHERE ct.group_id IS NULL AND ct.status = 'completed'), 0)) > 0.01 as needs_fix
  FROM clients c
  LEFT JOIN credit_transactions ct ON ct.client_id = c.id
  WHERE c.is_archived = false
    AND NOT EXISTS (SELECT 1 FROM client_budget_members bm WHERE bm.client_id = c.id)
  GROUP BY c.id, c.name, c.credit_balance;
  
  -- Budget groups
  RETURN QUERY
  SELECT 
    'group'::text as entity_type,
    bg.id as entity_id,
    bg.name as entity_name,
    COALESCE(bg.shared_balance, 0) as stored_balance,
    COALESCE(SUM(ct.amount) FILTER (WHERE ct.status = 'completed'), 0) as ledger_balance,
    COALESCE(bg.shared_balance, 0) - COALESCE(SUM(ct.amount) FILTER (WHERE ct.status = 'completed'), 0) as discrepancy,
    ABS(COALESCE(bg.shared_balance, 0) - COALESCE(SUM(ct.amount) FILTER (WHERE ct.status = 'completed'), 0)) > 0.01 as needs_fix
  FROM client_budget_groups bg
  LEFT JOIN credit_transactions ct ON ct.group_id = bg.id
  GROUP BY bg.id, bg.name, bg.shared_balance;
END;
$$;

-- 5. RPC: Fix balance discrepancy for a specific entity
CREATE OR REPLACE FUNCTION public.rpc_fix_balance_discrepancy(
  p_entity_type text,
  p_entity_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored numeric;
  v_ledger numeric;
  v_new_balance numeric;
BEGIN
  IF p_entity_type = 'client' THEN
    -- Get current values for individual client
    SELECT 
      COALESCE(c.credit_balance, 0),
      COALESCE(SUM(ct.amount) FILTER (WHERE ct.group_id IS NULL AND ct.status = 'completed'), 0)
    INTO v_stored, v_ledger
    FROM clients c
    LEFT JOIN credit_transactions ct ON ct.client_id = c.id
    WHERE c.id = p_entity_id
    GROUP BY c.id, c.credit_balance;
    
    -- Update to ledger value
    UPDATE clients 
    SET credit_balance = v_ledger, updated_at = now()
    WHERE id = p_entity_id
    RETURNING credit_balance INTO v_new_balance;
    
  ELSIF p_entity_type = 'group' THEN
    -- Get current values for group
    SELECT 
      COALESCE(bg.shared_balance, 0),
      COALESCE(SUM(ct.amount) FILTER (WHERE ct.status = 'completed'), 0)
    INTO v_stored, v_ledger
    FROM client_budget_groups bg
    LEFT JOIN credit_transactions ct ON ct.group_id = bg.id
    WHERE bg.id = p_entity_id
    GROUP BY bg.id, bg.shared_balance;
    
    -- Update to ledger value
    UPDATE client_budget_groups 
    SET shared_balance = v_ledger, updated_at = now()
    WHERE id = p_entity_id
    RETURNING shared_balance INTO v_new_balance;
    
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid entity type');
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'entity_type', p_entity_type,
    'entity_id', p_entity_id,
    'old_balance', v_stored,
    'ledger_balance', v_ledger,
    'new_balance', v_new_balance,
    'adjustment', v_ledger - v_stored
  );
END;
$$;

-- Grant permissions
GRANT SELECT ON public.vw_client_ledger_balances TO authenticated;
GRANT SELECT ON public.vw_group_ledger_balances TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_effective_balance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_audit_all_balances() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_fix_balance_discrepancy(text, uuid) TO authenticated;
