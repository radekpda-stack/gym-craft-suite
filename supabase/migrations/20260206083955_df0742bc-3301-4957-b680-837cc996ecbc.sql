-- ============================================================
-- Credit System Audit & Recalculation Functions
-- Purpose: Detect and fix discrepancies between stored balances and ledger
-- ============================================================

-- 1. Performance index for credit transaction sums
CREATE INDEX IF NOT EXISTS idx_credit_transactions_client_amount 
ON credit_transactions(client_id, amount) 
WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_credit_transactions_group_amount 
ON credit_transactions(group_id, amount) 
WHERE group_id IS NOT NULL AND status = 'completed';

-- 2. Function to get all balance discrepancies
CREATE OR REPLACE FUNCTION rpc_get_balance_discrepancies()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH group_discrepancies AS (
    SELECT 
      g.id,
      g.name,
      g.shared_balance as stored_balance,
      COALESCE(l.ledger_balance, 0) as calculated_balance,
      g.shared_balance - COALESCE(l.ledger_balance, 0) as discrepancy
    FROM client_budget_groups g
    LEFT JOIN vw_group_ledger_balances l ON g.id = l.group_id
    WHERE ABS(g.shared_balance - COALESCE(l.ledger_balance, 0)) > 0.01
  ),
  client_discrepancies AS (
    SELECT 
      c.id,
      c.name,
      c.credit_balance as stored_balance,
      COALESCE(l.ledger_balance, 0) as calculated_balance,
      c.credit_balance - COALESCE(l.ledger_balance, 0) as discrepancy
    FROM clients c
    LEFT JOIN vw_client_ledger_balances l ON c.id = l.client_id
    LEFT JOIN client_budget_members m ON c.id = m.client_id
    -- Only check individual clients (not in a group)
    WHERE m.client_id IS NULL
      AND ABS(c.credit_balance - COALESCE(l.ledger_balance, 0)) > 0.01
  )
  SELECT jsonb_build_object(
    'groups', COALESCE((SELECT jsonb_agg(row_to_json(gd)) FROM group_discrepancies gd), '[]'::jsonb),
    'clients', COALESCE((SELECT jsonb_agg(row_to_json(cd)) FROM client_discrepancies cd), '[]'::jsonb),
    'total_group_discrepancies', (SELECT COUNT(*) FROM group_discrepancies),
    'total_client_discrepancies', (SELECT COUNT(*) FROM client_discrepancies),
    'timestamp', now()
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- 3. Function to recalculate ALL balances from ledger
CREATE OR REPLACE FUNCTION rpc_recalculate_all_balances()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_groups_fixed integer := 0;
  v_clients_fixed integer := 0;
  v_transactions_linked integer := 0;
BEGIN
  -- Fix group balances
  UPDATE client_budget_groups g
  SET shared_balance = COALESCE(l.ledger_balance, 0)
  FROM vw_group_ledger_balances l
  WHERE g.id = l.group_id
    AND ABS(g.shared_balance - l.ledger_balance) > 0.01;
  
  GET DIAGNOSTICS v_groups_fixed = ROW_COUNT;
  
  -- Fix individual client balances (clients NOT in groups)
  UPDATE clients c
  SET credit_balance = COALESCE(l.ledger_balance, 0)
  FROM vw_client_ledger_balances l
  WHERE c.id = l.client_id
    AND NOT EXISTS (SELECT 1 FROM client_budget_members m WHERE m.client_id = c.id)
    AND ABS(c.credit_balance - l.ledger_balance) > 0.01;
  
  GET DIAGNOSTICS v_clients_fixed = ROW_COUNT;
  
  -- Reset balances for group members (should always be 0)
  UPDATE clients c
  SET credit_balance = 0
  WHERE EXISTS (SELECT 1 FROM client_budget_members m WHERE m.client_id = c.id)
    AND c.credit_balance != 0;
  
  v_clients_fixed := v_clients_fixed + (SELECT COUNT(*) FROM clients c 
    WHERE EXISTS (SELECT 1 FROM client_budget_members m WHERE m.client_id = c.id)
    AND c.credit_balance != 0);
  
  -- Link orphaned transactions to groups
  UPDATE credit_transactions ct
  SET group_id = m.group_id
  FROM client_budget_members m
  WHERE ct.client_id = m.client_id
    AND ct.group_id IS NULL
    AND ct.created_at >= m.joined_at;
  
  GET DIAGNOSTICS v_transactions_linked = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'groups_fixed', v_groups_fixed,
    'clients_fixed', v_clients_fixed,
    'transactions_linked', v_transactions_linked,
    'timestamp', now()
  );
END;
$$;

-- 4. Function to recalculate single client balance
CREATE OR REPLACE FUNCTION rpc_recalculate_client_balance(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_in_group boolean;
  v_group_id uuid;
  v_old_balance numeric;
  v_new_balance numeric;
BEGIN
  -- Check if client is in a group
  SELECT m.group_id INTO v_group_id
  FROM client_budget_members m
  WHERE m.client_id = p_client_id;
  
  v_is_in_group := v_group_id IS NOT NULL;
  
  IF v_is_in_group THEN
    -- For group members, just reset personal balance to 0
    SELECT credit_balance INTO v_old_balance FROM clients WHERE id = p_client_id;
    UPDATE clients SET credit_balance = 0 WHERE id = p_client_id;
    v_new_balance := 0;
  ELSE
    -- For individual clients, recalculate from ledger
    SELECT credit_balance INTO v_old_balance FROM clients WHERE id = p_client_id;
    SELECT COALESCE(ledger_balance, 0) INTO v_new_balance 
    FROM vw_client_ledger_balances WHERE client_id = p_client_id;
    
    UPDATE clients SET credit_balance = v_new_balance WHERE id = p_client_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'client_id', p_client_id,
    'old_balance', v_old_balance,
    'new_balance', v_new_balance,
    'in_group', v_is_in_group,
    'group_id', v_group_id,
    'difference', v_old_balance - v_new_balance
  );
END;
$$;

-- 5. Function to recalculate single group balance
CREATE OR REPLACE FUNCTION rpc_recalculate_group_balance(p_group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_balance numeric;
  v_new_balance numeric;
  v_transactions_linked integer := 0;
BEGIN
  -- Get current balance
  SELECT shared_balance INTO v_old_balance 
  FROM client_budget_groups WHERE id = p_group_id;
  
  -- Get ledger balance
  SELECT COALESCE(ledger_balance, 0) INTO v_new_balance 
  FROM vw_group_ledger_balances WHERE group_id = p_group_id;
  
  -- Update balance
  UPDATE client_budget_groups 
  SET shared_balance = v_new_balance 
  WHERE id = p_group_id;
  
  -- Link orphaned transactions
  UPDATE credit_transactions ct
  SET group_id = p_group_id
  FROM client_budget_members m
  WHERE ct.client_id = m.client_id
    AND m.group_id = p_group_id
    AND ct.group_id IS NULL
    AND ct.created_at >= m.joined_at;
  
  GET DIAGNOSTICS v_transactions_linked = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'group_id', p_group_id,
    'old_balance', v_old_balance,
    'new_balance', v_new_balance,
    'difference', v_old_balance - v_new_balance,
    'transactions_linked', v_transactions_linked
  );
END;
$$;