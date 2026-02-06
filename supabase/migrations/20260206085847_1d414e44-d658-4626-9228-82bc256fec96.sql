-- =====================================================
-- CREDIT SYSTEM FIX: Ledger as single source of truth
-- =====================================================

-- STEP 1: Create audit functions for detecting and fixing discrepancies
-- =====================================================

-- Function to audit all balances and return discrepancies
CREATE OR REPLACE FUNCTION rpc_audit_all_balances()
RETURNS TABLE (
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
SET search_path TO 'public'
AS $$
BEGIN
  -- Return individual clients (not in groups) with discrepancies
  RETURN QUERY
  SELECT 
    'client'::text as entity_type,
    c.id as entity_id,
    c.name as entity_name,
    COALESCE(c.credit_balance, 0) as stored_balance,
    COALESCE(lb.ledger_balance, 0) as ledger_balance,
    COALESCE(c.credit_balance, 0) - COALESCE(lb.ledger_balance, 0) as discrepancy,
    ABS(COALESCE(c.credit_balance, 0) - COALESCE(lb.ledger_balance, 0)) > 0.01 as needs_fix
  FROM clients c
  LEFT JOIN vw_client_ledger_balances lb ON lb.client_id = c.id
  WHERE NOT EXISTS (
    SELECT 1 FROM client_budget_members bm WHERE bm.client_id = c.id
  )
  AND c.is_archived = false;

  -- Return group members who should have 0 balance but don't
  RETURN QUERY
  SELECT 
    'group_member'::text as entity_type,
    c.id as entity_id,
    c.name as entity_name,
    COALESCE(c.credit_balance, 0) as stored_balance,
    0::numeric as ledger_balance,
    COALESCE(c.credit_balance, 0) as discrepancy,
    ABS(COALESCE(c.credit_balance, 0)) > 0.01 as needs_fix
  FROM clients c
  WHERE EXISTS (
    SELECT 1 FROM client_budget_members bm WHERE bm.client_id = c.id
  )
  AND c.is_archived = false
  AND COALESCE(c.credit_balance, 0) != 0;

  -- Return groups with discrepancies
  RETURN QUERY
  SELECT 
    'group'::text as entity_type,
    g.id as entity_id,
    g.name as entity_name,
    COALESCE(g.shared_balance, 0) as stored_balance,
    COALESCE(lb.ledger_balance, 0) as ledger_balance,
    COALESCE(g.shared_balance, 0) - COALESCE(lb.ledger_balance, 0) as discrepancy,
    ABS(COALESCE(g.shared_balance, 0) - COALESCE(lb.ledger_balance, 0)) > 0.01 as needs_fix
  FROM client_budget_groups g
  LEFT JOIN vw_group_ledger_balances lb ON lb.group_id = g.id;
END;
$$;

-- Function to fix a single discrepancy
CREATE OR REPLACE FUNCTION rpc_fix_balance_discrepancy(
  p_entity_type text,
  p_entity_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_balance numeric;
  v_new_balance numeric;
  v_adjustment numeric;
BEGIN
  IF p_entity_type = 'client' THEN
    -- Get current stored balance
    SELECT credit_balance INTO v_old_balance
    FROM clients WHERE id = p_entity_id;
    
    -- Get ledger balance
    SELECT ledger_balance INTO v_new_balance
    FROM vw_client_ledger_balances WHERE client_id = p_entity_id;
    
    v_new_balance := COALESCE(v_new_balance, 0);
    v_adjustment := v_new_balance - COALESCE(v_old_balance, 0);
    
    -- Update to match ledger
    UPDATE clients
    SET credit_balance = v_new_balance,
        updated_at = now()
    WHERE id = p_entity_id;
    
  ELSIF p_entity_type = 'group_member' THEN
    -- Group members should have 0 personal balance
    SELECT credit_balance INTO v_old_balance
    FROM clients WHERE id = p_entity_id;
    
    v_new_balance := 0;
    v_adjustment := -COALESCE(v_old_balance, 0);
    
    UPDATE clients
    SET credit_balance = 0,
        updated_at = now()
    WHERE id = p_entity_id;
    
  ELSIF p_entity_type = 'group' THEN
    -- Get current stored balance
    SELECT shared_balance INTO v_old_balance
    FROM client_budget_groups WHERE id = p_entity_id;
    
    -- Get ledger balance
    SELECT ledger_balance INTO v_new_balance
    FROM vw_group_ledger_balances WHERE group_id = p_entity_id;
    
    v_new_balance := COALESCE(v_new_balance, 0);
    v_adjustment := v_new_balance - COALESCE(v_old_balance, 0);
    
    -- Update to match ledger
    UPDATE client_budget_groups
    SET shared_balance = v_new_balance,
        updated_at = now()
    WHERE id = p_entity_id;
    
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unknown entity type: ' || p_entity_type
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'entity_type', p_entity_type,
    'entity_id', p_entity_id,
    'old_balance', COALESCE(v_old_balance, 0),
    'ledger_balance', v_new_balance,
    'new_balance', v_new_balance,
    'adjustment', v_adjustment
  );
END;
$$;

-- STEP 2: Strengthen the sync trigger with better logging
-- =====================================================

CREATE OR REPLACE FUNCTION trg_sync_balance_on_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_group_id uuid;
  v_new_balance numeric;
BEGIN
  -- Only process completed transactions
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Check if client is in a budget group
  SELECT group_id INTO v_group_id
  FROM client_budget_members
  WHERE client_id = NEW.client_id;
  
  IF v_group_id IS NOT NULL THEN
    -- Update group balance
    UPDATE client_budget_groups
    SET shared_balance = shared_balance + NEW.amount,
        updated_at = now()
    WHERE id = v_group_id
    RETURNING shared_balance INTO v_new_balance;
    
    RAISE LOG 'Credit trigger: Updated group % balance by %, new balance: %', 
              v_group_id, NEW.amount, v_new_balance;
  ELSE
    -- Update individual client balance
    UPDATE clients
    SET credit_balance = credit_balance + NEW.amount,
        updated_at = now()
    WHERE id = NEW.client_id
    RETURNING credit_balance INTO v_new_balance;
    
    RAISE LOG 'Credit trigger: Updated client % balance by %, new balance: %', 
              NEW.client_id, NEW.amount, v_new_balance;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trg_sync_balance_on_transaction ON credit_transactions;
CREATE TRIGGER trg_sync_balance_on_transaction
  AFTER INSERT ON credit_transactions
  FOR EACH ROW
  EXECUTE FUNCTION trg_sync_balance_on_transaction();

-- STEP 3: One-time fix for all existing discrepancies
-- =====================================================

-- Fix individual clients (not in groups) - sync to ledger
UPDATE clients c
SET credit_balance = COALESCE(ledger.ledger_balance, 0),
    updated_at = now()
FROM vw_client_ledger_balances ledger
WHERE c.id = ledger.client_id
AND NOT EXISTS (
  SELECT 1 FROM client_budget_members bm WHERE bm.client_id = c.id
)
AND COALESCE(c.credit_balance, 0) != COALESCE(ledger.ledger_balance, 0);

-- Reset group members' personal balances to 0
UPDATE clients c
SET credit_balance = 0,
    updated_at = now()
WHERE EXISTS (
  SELECT 1 FROM client_budget_members bm WHERE bm.client_id = c.id
)
AND COALESCE(c.credit_balance, 0) != 0;

-- Fix group balances - sync to ledger
UPDATE client_budget_groups g
SET shared_balance = COALESCE(ledger.ledger_balance, 0),
    updated_at = now()
FROM vw_group_ledger_balances ledger
WHERE g.id = ledger.group_id
AND COALESCE(g.shared_balance, 0) != COALESCE(ledger.ledger_balance, 0);