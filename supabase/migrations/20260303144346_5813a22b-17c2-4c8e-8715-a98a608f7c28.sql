
-- =============================================================
-- FIX: rpc_apply_credit_delta → no-op passthrough
-- The trigger fn_sync_client_credit_balance already recalculates
-- cached balances from SUM(credit_transactions.amount) on every
-- INSERT/UPDATE/DELETE. Calling rpc_apply_credit_delta on top of
-- that DOUBLE-COUNTS the delta. 
-- 
-- New behavior: just return current ledger balance without any UPDATE.
-- =============================================================

CREATE OR REPLACE FUNCTION public.rpc_apply_credit_delta(
  p_client_id uuid,
  p_delta numeric,
  p_reason text DEFAULT NULL,
  p_ref_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
  v_new_balance numeric;
  v_entity_type text;
BEGIN
  -- Check if client is in a budget group
  SELECT group_id INTO v_group_id 
  FROM client_budget_members 
  WHERE client_id = p_client_id;
  
  IF v_group_id IS NOT NULL THEN
    -- Read current balance from cached column (kept in sync by trigger)
    SELECT COALESCE(shared_balance, 0) INTO v_new_balance
    FROM client_budget_groups
    WHERE id = v_group_id;
    
    v_entity_type := 'group';
  ELSE
    -- Read current balance from cached column (kept in sync by trigger)
    SELECT COALESCE(credit_balance, 0) INTO v_new_balance
    FROM clients
    WHERE id = p_client_id;
    
    v_entity_type := 'client';
  END IF;
  
  -- NO UPDATE — the trigger fn_sync_client_credit_balance / fn_sync_group_credit_balance
  -- already recalculates from SUM(credit_transactions.amount) on every tx change.
  
  RETURN jsonb_build_object(
    'success', true,
    'entity_type', v_entity_type,
    'entity_id', COALESCE(v_group_id, p_client_id),
    'new_balance', v_new_balance,
    'delta', p_delta,
    'client_id', p_client_id,
    'group_id', v_group_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- =============================================================
-- FIX: rpc_process_sale — remove PERFORM rpc_apply_credit_delta calls
-- The INSERT into credit_transactions already fires the sync trigger.
-- We need to recreate the function without those PERFORM lines.
-- =============================================================

-- First, let's also fix the rpc_process_sale_refund and rpc_process_sale_item_return
-- by removing the rpc_apply_credit_delta calls from them too.
-- We'll use a simpler approach: just remove the PERFORM calls.

-- Since we can't easily ALTER a function body, we just make rpc_apply_credit_delta
-- a no-op (done above), which effectively fixes all callers including rpc_process_sale.

-- =============================================================
-- REPAIR: One-time reconciliation of cached balances with ledger
-- =============================================================

-- Recalculate ALL individual client balances from ledger
UPDATE clients c
SET credit_balance = sub.ledger_balance,
    updated_at = now()
FROM (
  SELECT ct.client_id, COALESCE(SUM(ct.amount), 0) as ledger_balance
  FROM credit_transactions ct
  WHERE ct.status = 'completed'
    AND ct.group_id IS NULL
  GROUP BY ct.client_id
) sub
WHERE c.id = sub.client_id
  AND NOT EXISTS (SELECT 1 FROM client_budget_members cbm WHERE cbm.client_id = c.id);

-- Set balance to 0 for clients with no transactions (who are not in groups)
UPDATE clients c
SET credit_balance = 0,
    updated_at = now()
WHERE NOT EXISTS (
  SELECT 1 FROM credit_transactions ct 
  WHERE ct.client_id = c.id AND ct.status = 'completed' AND ct.group_id IS NULL
)
AND NOT EXISTS (
  SELECT 1 FROM client_budget_members cbm WHERE cbm.client_id = c.id
)
AND c.credit_balance != 0;

-- Recalculate ALL group balances from ledger
UPDATE client_budget_groups g
SET shared_balance = COALESCE(sub.ledger_balance, 0),
    updated_at = now()
FROM (
  SELECT ct.group_id, COALESCE(SUM(ct.amount), 0) as ledger_balance
  FROM credit_transactions ct
  WHERE ct.status = 'completed'
    AND ct.group_id IS NOT NULL
  GROUP BY ct.group_id
) sub
WHERE g.id = sub.group_id;

-- Set balance to 0 for groups with no transactions
UPDATE client_budget_groups g
SET shared_balance = 0,
    updated_at = now()
WHERE NOT EXISTS (
  SELECT 1 FROM credit_transactions ct 
  WHERE ct.group_id = g.id AND ct.status = 'completed'
)
AND g.shared_balance != 0;
