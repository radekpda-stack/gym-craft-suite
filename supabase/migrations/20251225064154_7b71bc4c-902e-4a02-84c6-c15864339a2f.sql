-- ============================================
-- SHARED BUDGET SYSTEM - INTEGRITY & ATOMIC UPDATES
-- ============================================

-- 1) UNIQUE CONSTRAINTS - ensure one client can only be in one group
-- First check if constraint exists, drop if needed, then create
DO $$
BEGIN
  -- Drop existing constraints if they exist
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_budget_members_client_id_key') THEN
    ALTER TABLE public.client_budget_members DROP CONSTRAINT client_budget_members_client_id_key;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_budget_members_group_client_unique') THEN
    ALTER TABLE public.client_budget_members DROP CONSTRAINT client_budget_members_group_client_unique;
  END IF;
END $$;

-- Add UNIQUE constraint on client_id (one client = max one group)
ALTER TABLE public.client_budget_members 
ADD CONSTRAINT client_budget_members_client_id_unique UNIQUE (client_id);

-- Add UNIQUE constraint on (group_id, client_id) for safety
ALTER TABLE public.client_budget_members 
ADD CONSTRAINT client_budget_members_group_client_unique UNIQUE (group_id, client_id);

-- 2) INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_client_budget_members_client_id ON public.client_budget_members(client_id);
CREATE INDEX IF NOT EXISTS idx_client_budget_members_group_id ON public.client_budget_members(group_id);
CREATE INDEX IF NOT EXISTS idx_clients_credit_balance ON public.clients(credit_balance) WHERE credit_balance < 0;
CREATE INDEX IF NOT EXISTS idx_client_budget_groups_shared_balance ON public.client_budget_groups(shared_balance) WHERE shared_balance < 0;

-- 3) RPC FUNCTION - Atomic credit delta application
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
  v_user_id uuid;
BEGIN
  -- Get the user_id from the client
  SELECT user_id INTO v_user_id FROM clients WHERE id = p_client_id;
  
  -- Check if client is in a budget group
  SELECT group_id INTO v_group_id 
  FROM client_budget_members 
  WHERE client_id = p_client_id;
  
  IF v_group_id IS NOT NULL THEN
    -- Client is in a group - update shared_balance atomically
    UPDATE client_budget_groups 
    SET shared_balance = COALESCE(shared_balance, 0) + p_delta,
        updated_at = now()
    WHERE id = v_group_id
    RETURNING shared_balance INTO v_new_balance;
    
    v_entity_type := 'group';
  ELSE
    -- Individual client - update credit_balance atomically
    UPDATE clients 
    SET credit_balance = COALESCE(credit_balance, 0) + p_delta,
        updated_at = now()
    WHERE id = p_client_id
    RETURNING credit_balance INTO v_new_balance;
    
    v_entity_type := 'client';
  END IF;
  
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

-- 4) RPC FUNCTION - Get pending payments (individual + group debtors)
CREATE OR REPLACE FUNCTION public.rpc_get_pending_payments(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_individual_debtors jsonb;
  v_group_debtors jsonb;
BEGIN
  -- Individual debtors: clients with negative balance NOT in any group
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'credit_balance', c.credit_balance,
      'type', 'individual'
    )
  ), '[]'::jsonb)
  INTO v_individual_debtors
  FROM clients c
  WHERE c.user_id = p_user_id
    AND c.is_archived = false
    AND COALESCE(c.credit_balance, 0) < 0
    AND NOT EXISTS (
      SELECT 1 FROM client_budget_members cbm WHERE cbm.client_id = c.id
    );
  
  -- Group debtors: groups with negative shared_balance
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', g.id,
      'name', g.name,
      'shared_balance', g.shared_balance,
      'type', 'group',
      'members', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', c.id,
            'name', c.name
          )
        )
        FROM client_budget_members cbm
        JOIN clients c ON c.id = cbm.client_id
        WHERE cbm.group_id = g.id
      )
    )
  ), '[]'::jsonb)
  INTO v_group_debtors
  FROM client_budget_groups g
  WHERE g.user_id = p_user_id
    AND COALESCE(g.shared_balance, 0) < 0;
  
  RETURN jsonb_build_object(
    'individual', v_individual_debtors,
    'groups', v_group_debtors,
    'total_individual_amount', (
      SELECT COALESCE(SUM(ABS(c.credit_balance)), 0)
      FROM clients c
      WHERE c.user_id = p_user_id
        AND c.is_archived = false
        AND COALESCE(c.credit_balance, 0) < 0
        AND NOT EXISTS (
          SELECT 1 FROM client_budget_members cbm WHERE cbm.client_id = c.id
        )
    ),
    'total_group_amount', (
      SELECT COALESCE(SUM(ABS(g.shared_balance)), 0)
      FROM client_budget_groups g
      WHERE g.user_id = p_user_id
        AND COALESCE(g.shared_balance, 0) < 0
    )
  );
END;
$$;

-- 5) Trigger to reset client credit_balance to 0 when added to a group
CREATE OR REPLACE FUNCTION public.on_client_added_to_budget_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a client is added to a budget group, their personal credit becomes irrelevant
  -- We could optionally transfer their balance to the group, but for now just note it
  -- The application should handle balance transfer if needed before adding to group
  UPDATE clients 
  SET credit_balance = 0, updated_at = now()
  WHERE id = NEW.client_id;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_client_added_to_budget_group ON public.client_budget_members;

CREATE TRIGGER trigger_client_added_to_budget_group
AFTER INSERT ON public.client_budget_members
FOR EACH ROW
EXECUTE FUNCTION public.on_client_added_to_budget_group();