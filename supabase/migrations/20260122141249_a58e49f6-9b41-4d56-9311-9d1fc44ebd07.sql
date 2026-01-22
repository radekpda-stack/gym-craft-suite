-- =====================================================
-- CREDIT SYSTEM INTEGRITY FIX
-- Complete solution for balance synchronization
-- =====================================================

-- 1. TRIGGER: Auto-sync when member added to budget group
-- =====================================================

CREATE OR REPLACE FUNCTION trg_on_member_added_to_group()
RETURNS trigger AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  -- 1. Assign group_id to all client's orphaned transactions
  UPDATE credit_transactions
  SET group_id = NEW.group_id
  WHERE client_id = NEW.client_id
    AND group_id IS NULL;
  
  -- 2. Recalculate shared_balance from entire ledger
  SELECT COALESCE(SUM(ct.amount), 0) INTO v_new_balance
  FROM credit_transactions ct
  JOIN client_budget_members cbm ON ct.client_id = cbm.client_id
  WHERE cbm.group_id = NEW.group_id;
  
  UPDATE client_budget_groups
  SET shared_balance = v_new_balance,
      updated_at = now()
  WHERE id = NEW.group_id;
  
  -- 3. Reset individual client balance to 0 (now part of group)
  UPDATE clients
  SET credit_balance = 0,
      updated_at = now()
  WHERE id = NEW.client_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on client_budget_members
DROP TRIGGER IF EXISTS on_member_added_to_budget_group ON client_budget_members;
CREATE TRIGGER on_member_added_to_budget_group
AFTER INSERT ON client_budget_members
FOR EACH ROW EXECUTE FUNCTION trg_on_member_added_to_group();

-- 2. RPC: Recalculate single client balance
-- =====================================================

CREATE OR REPLACE FUNCTION rpc_recalculate_client_balance(p_client_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_old_balance numeric;
  v_new_balance numeric;
  v_in_group boolean;
  v_group_id uuid;
BEGIN
  -- Check if client is in a budget group
  SELECT cbm.group_id INTO v_group_id
  FROM client_budget_members cbm
  WHERE cbm.client_id = p_client_id;
  
  v_in_group := v_group_id IS NOT NULL;
  
  -- Get current balance
  SELECT credit_balance INTO v_old_balance
  FROM clients WHERE id = p_client_id;
  
  IF v_in_group THEN
    -- Client is in group - their individual balance should be 0
    UPDATE clients
    SET credit_balance = 0, updated_at = now()
    WHERE id = p_client_id;
    
    v_new_balance := 0;
  ELSE
    -- Calculate from ledger for individual client
    SELECT COALESCE(SUM(amount), 0) INTO v_new_balance
    FROM credit_transactions
    WHERE client_id = p_client_id;
    
    UPDATE clients
    SET credit_balance = v_new_balance, updated_at = now()
    WHERE id = p_client_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'client_id', p_client_id,
    'old_balance', v_old_balance,
    'new_balance', v_new_balance,
    'in_group', v_in_group,
    'group_id', v_group_id,
    'difference', v_new_balance - COALESCE(v_old_balance, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC: Recalculate single group balance
-- =====================================================

CREATE OR REPLACE FUNCTION rpc_recalculate_group_balance(p_group_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_old_balance numeric;
  v_new_balance numeric;
  v_transactions_updated int;
BEGIN
  -- Get current balance
  SELECT shared_balance INTO v_old_balance
  FROM client_budget_groups WHERE id = p_group_id;
  
  -- First, ensure all member transactions have group_id set
  UPDATE credit_transactions ct
  SET group_id = p_group_id
  FROM client_budget_members cbm
  WHERE ct.client_id = cbm.client_id
    AND cbm.group_id = p_group_id
    AND ct.group_id IS NULL;
  
  GET DIAGNOSTICS v_transactions_updated = ROW_COUNT;
  
  -- Calculate from ledger
  SELECT COALESCE(SUM(ct.amount), 0) INTO v_new_balance
  FROM credit_transactions ct
  JOIN client_budget_members cbm ON ct.client_id = cbm.client_id
  WHERE cbm.group_id = p_group_id;
  
  UPDATE client_budget_groups
  SET shared_balance = v_new_balance, updated_at = now()
  WHERE id = p_group_id;
  
  -- Reset individual balances for group members
  UPDATE clients c
  SET credit_balance = 0, updated_at = now()
  FROM client_budget_members cbm
  WHERE c.id = cbm.client_id AND cbm.group_id = p_group_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'group_id', p_group_id,
    'old_balance', v_old_balance,
    'new_balance', v_new_balance,
    'difference', v_new_balance - COALESCE(v_old_balance, 0),
    'transactions_linked', v_transactions_updated
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: Recalculate ALL balances (groups + individuals)
-- =====================================================

CREATE OR REPLACE FUNCTION rpc_recalculate_all_balances()
RETURNS jsonb AS $$
DECLARE
  v_groups_fixed int := 0;
  v_clients_fixed int := 0;
  v_transactions_linked int := 0;
  v_group record;
  v_client record;
  v_result jsonb;
BEGIN
  -- Step 1: Backfill missing group_id on transactions
  UPDATE credit_transactions ct
  SET group_id = cbm.group_id
  FROM client_budget_members cbm
  WHERE ct.client_id = cbm.client_id
    AND ct.group_id IS NULL;
  
  GET DIAGNOSTICS v_transactions_linked = ROW_COUNT;
  
  -- Step 2: Recalculate all group balances
  FOR v_group IN 
    SELECT cbg.id, cbg.shared_balance as old_balance,
           COALESCE(SUM(ct.amount), 0) as new_balance
    FROM client_budget_groups cbg
    LEFT JOIN client_budget_members cbm ON cbg.id = cbm.group_id
    LEFT JOIN credit_transactions ct ON ct.client_id = cbm.client_id
    GROUP BY cbg.id
    HAVING cbg.shared_balance IS DISTINCT FROM COALESCE(SUM(ct.amount), 0)
  LOOP
    UPDATE client_budget_groups
    SET shared_balance = v_group.new_balance, updated_at = now()
    WHERE id = v_group.id;
    
    v_groups_fixed := v_groups_fixed + 1;
  END LOOP;
  
  -- Step 3: Reset credit_balance for all grouped clients to 0
  UPDATE clients c
  SET credit_balance = 0, updated_at = now()
  FROM client_budget_members cbm
  WHERE c.id = cbm.client_id AND c.credit_balance != 0;
  
  -- Step 4: Recalculate individual client balances (not in groups)
  FOR v_client IN
    SELECT c.id, c.credit_balance as old_balance,
           COALESCE(SUM(ct.amount), 0) as new_balance
    FROM clients c
    LEFT JOIN client_budget_members cbm ON c.id = cbm.client_id
    LEFT JOIN credit_transactions ct ON ct.client_id = c.id
    WHERE cbm.client_id IS NULL  -- Not in any group
      AND c.is_archived = false
    GROUP BY c.id
    HAVING c.credit_balance IS DISTINCT FROM COALESCE(SUM(ct.amount), 0)
  LOOP
    UPDATE clients
    SET credit_balance = v_client.new_balance, updated_at = now()
    WHERE id = v_client.id;
    
    v_clients_fixed := v_clients_fixed + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'groups_fixed', v_groups_fixed,
    'clients_fixed', v_clients_fixed,
    'transactions_linked', v_transactions_linked,
    'timestamp', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: Get balance discrepancies (for audit panel)
-- =====================================================

CREATE OR REPLACE FUNCTION rpc_get_balance_discrepancies()
RETURNS jsonb AS $$
DECLARE
  v_group_discrepancies jsonb;
  v_client_discrepancies jsonb;
BEGIN
  -- Get group discrepancies
  SELECT COALESCE(jsonb_agg(row_to_json(g)), '[]'::jsonb)
  INTO v_group_discrepancies
  FROM (
    SELECT 
      cbg.id,
      cbg.name,
      cbg.shared_balance as stored_balance,
      COALESCE(SUM(ct.amount), 0) as calculated_balance,
      cbg.shared_balance - COALESCE(SUM(ct.amount), 0) as discrepancy
    FROM client_budget_groups cbg
    LEFT JOIN client_budget_members cbm ON cbg.id = cbm.group_id
    LEFT JOIN credit_transactions ct ON ct.client_id = cbm.client_id
    GROUP BY cbg.id
    HAVING ABS(cbg.shared_balance - COALESCE(SUM(ct.amount), 0)) > 0.01
    ORDER BY ABS(cbg.shared_balance - COALESCE(SUM(ct.amount), 0)) DESC
  ) g;
  
  -- Get individual client discrepancies (not in groups)
  SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]'::jsonb)
  INTO v_client_discrepancies
  FROM (
    SELECT 
      c.id,
      c.name,
      c.credit_balance as stored_balance,
      COALESCE(SUM(ct.amount), 0) as calculated_balance,
      c.credit_balance - COALESCE(SUM(ct.amount), 0) as discrepancy
    FROM clients c
    LEFT JOIN client_budget_members cbm ON c.id = cbm.client_id
    LEFT JOIN credit_transactions ct ON ct.client_id = c.id
    WHERE cbm.client_id IS NULL  -- Not in any group
      AND c.is_archived = false
    GROUP BY c.id
    HAVING ABS(c.credit_balance - COALESCE(SUM(ct.amount), 0)) > 0.01
    ORDER BY ABS(c.credit_balance - COALESCE(SUM(ct.amount), 0)) DESC
    LIMIT 50
  ) c;
  
  RETURN jsonb_build_object(
    'groups', v_group_discrepancies,
    'clients', v_client_discrepancies,
    'total_group_discrepancies', jsonb_array_length(v_group_discrepancies),
    'total_client_discrepancies', jsonb_array_length(v_client_discrepancies),
    'timestamp', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. EXECUTE BACKFILL NOW
-- =====================================================

-- This runs the full recalculation immediately
SELECT rpc_recalculate_all_balances();