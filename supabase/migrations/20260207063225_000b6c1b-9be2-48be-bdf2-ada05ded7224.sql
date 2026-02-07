-- ============================================================
-- CREDIT SYSTEM v2: Event Sourcing Architecture
-- ============================================================

-- Phase 1: Add new columns to credit_transactions
-- ============================================================

-- Add balance_after column for running balance (O(1) balance lookup)
ALTER TABLE credit_transactions 
ADD COLUMN IF NOT EXISTS balance_after NUMERIC;

-- Add source tracking columns for audit trail
ALTER TABLE credit_transactions 
ADD COLUMN IF NOT EXISTS source_type TEXT;

ALTER TABLE credit_transactions 
ADD COLUMN IF NOT EXISTS source_id UUID;

-- Add idempotency key to prevent duplicate transactions
ALTER TABLE credit_transactions 
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Add constraint for idempotency (only for new records)
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_transactions_idempotency 
ON credit_transactions(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Index for source lookups
CREATE INDEX IF NOT EXISTS idx_credit_transactions_source 
ON credit_transactions(source_type, source_id) 
WHERE source_type IS NOT NULL;

-- Index for running balance queries (latest transaction per client)
CREATE INDEX IF NOT EXISTS idx_credit_transactions_client_latest 
ON credit_transactions(client_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_group_latest 
ON credit_transactions(group_id, created_at DESC, id DESC) 
WHERE group_id IS NOT NULL;

-- Phase 2: Create trigger for automatic running balance calculation
-- ============================================================

CREATE OR REPLACE FUNCTION trg_set_running_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_previous_balance NUMERIC;
BEGIN
  -- Skip if balance_after is already set (e.g., from RPC)
  IF NEW.balance_after IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Only process completed transactions
  IF NEW.status IS DISTINCT FROM 'completed' THEN
    RETURN NEW;
  END IF;

  -- Get the previous balance for this entity
  IF NEW.group_id IS NOT NULL THEN
    -- Group transaction: get last balance for this group
    SELECT balance_after INTO v_previous_balance
    FROM credit_transactions
    WHERE group_id = NEW.group_id
      AND status = 'completed'
      AND id != NEW.id
    ORDER BY created_at DESC, id DESC
    LIMIT 1;
  ELSE
    -- Individual transaction: get last balance for this client (non-group)
    SELECT balance_after INTO v_previous_balance
    FROM credit_transactions
    WHERE client_id = NEW.client_id
      AND group_id IS NULL
      AND status = 'completed'
      AND id != NEW.id
    ORDER BY created_at DESC, id DESC
    LIMIT 1;
  END IF;

  -- Calculate new running balance
  NEW.balance_after := COALESCE(v_previous_balance, 0) + NEW.amount;

  RETURN NEW;
END;
$$;

-- Create trigger (drop first to avoid duplicates)
DROP TRIGGER IF EXISTS trg_credit_running_balance ON credit_transactions;
CREATE TRIGGER trg_credit_running_balance
  BEFORE INSERT ON credit_transactions
  FOR EACH ROW
  EXECUTE FUNCTION trg_set_running_balance();

-- Phase 3: Backfill running balances for existing transactions
-- ============================================================

-- Create function to recalculate running balances for a client
CREATE OR REPLACE FUNCTION rpc_recalculate_running_balances(
  p_client_id UUID DEFAULT NULL,
  p_group_id UUID DEFAULT NULL
)
RETURNS TABLE(
  transactions_updated INTEGER,
  final_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_running_balance NUMERIC := 0;
  v_count INTEGER := 0;
  v_tx RECORD;
BEGIN
  IF p_group_id IS NOT NULL THEN
    -- Recalculate for group
    FOR v_tx IN 
      SELECT id, amount 
      FROM credit_transactions 
      WHERE group_id = p_group_id AND status = 'completed'
      ORDER BY created_at ASC, id ASC
    LOOP
      v_running_balance := v_running_balance + v_tx.amount;
      UPDATE credit_transactions 
      SET balance_after = v_running_balance 
      WHERE id = v_tx.id;
      v_count := v_count + 1;
    END LOOP;
  ELSIF p_client_id IS NOT NULL THEN
    -- Recalculate for individual client (non-group transactions)
    FOR v_tx IN 
      SELECT id, amount 
      FROM credit_transactions 
      WHERE client_id = p_client_id AND group_id IS NULL AND status = 'completed'
      ORDER BY created_at ASC, id ASC
    LOOP
      v_running_balance := v_running_balance + v_tx.amount;
      UPDATE credit_transactions 
      SET balance_after = v_running_balance 
      WHERE id = v_tx.id;
      v_count := v_count + 1;
    END LOOP;
  END IF;

  RETURN QUERY SELECT v_count, v_running_balance;
END;
$$;

-- Phase 4: Unified Credit RPC Functions
-- ============================================================

-- 4.1: rpc_credit_add - Add credit (payment, top-up)
CREATE OR REPLACE FUNCTION rpc_credit_add(
  p_client_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT DEFAULT 'cash',
  p_description TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_group_id UUID;
  v_previous_balance NUMERIC;
  v_new_balance NUMERIC;
  v_tx_id UUID;
  v_entity_type TEXT;
  v_entity_id UUID;
  v_entity_name TEXT;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Amount must be positive'
    );
  END IF;

  -- Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_tx_id FROM credit_transactions WHERE idempotency_key = p_idempotency_key;
    IF v_tx_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_tx_id,
        'message', 'Duplicate request - transaction already exists',
        'duplicate', true
      );
    END IF;
  END IF;

  -- Get current user
  v_user_id := auth.uid();

  -- Check if client is in a budget group
  SELECT cbm.group_id, cbg.name INTO v_group_id, v_entity_name
  FROM client_budget_members cbm
  JOIN client_budget_groups cbg ON cbg.id = cbm.group_id
  WHERE cbm.client_id = p_client_id;

  IF v_group_id IS NOT NULL THEN
    v_entity_type := 'group';
    v_entity_id := v_group_id;
    
    -- Get previous group balance
    SELECT COALESCE(balance_after, 0) INTO v_previous_balance
    FROM credit_transactions
    WHERE group_id = v_group_id AND status = 'completed'
    ORDER BY created_at DESC, id DESC
    LIMIT 1;
  ELSE
    v_entity_type := 'client';
    v_entity_id := p_client_id;
    
    -- Get client name
    SELECT name INTO v_entity_name FROM clients WHERE id = p_client_id;
    
    -- Get previous client balance
    SELECT COALESCE(balance_after, 0) INTO v_previous_balance
    FROM credit_transactions
    WHERE client_id = p_client_id AND group_id IS NULL AND status = 'completed'
    ORDER BY created_at DESC, id DESC
    LIMIT 1;
  END IF;

  v_previous_balance := COALESCE(v_previous_balance, 0);
  v_new_balance := v_previous_balance + p_amount;

  -- Insert transaction with running balance
  INSERT INTO credit_transactions (
    client_id,
    amount,
    type,
    description,
    payment_method,
    user_id,
    group_id,
    status,
    source_type,
    balance_after,
    idempotency_key
  ) VALUES (
    p_client_id,
    p_amount,
    'payment',
    COALESCE(p_description, 'Dobití kreditu'),
    p_payment_method,
    v_user_id,
    v_group_id,
    'completed',
    'admin_panel',
    v_new_balance,
    p_idempotency_key
  )
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'balance', jsonb_build_object(
      'entity_type', v_entity_type,
      'entity_id', v_entity_id,
      'entity_name', v_entity_name,
      'new_balance', v_new_balance,
      'previous_balance', v_previous_balance,
      'delta', p_amount
    ),
    'message', format('Kredit navýšen o %s Kč', p_amount),
    'timestamp', now()
  );
END;
$$;

-- 4.2: rpc_credit_deduct - Deduct credit (training, sale)
CREATE OR REPLACE FUNCTION rpc_credit_deduct(
  p_client_id UUID,
  p_amount NUMERIC,
  p_source_type TEXT,
  p_source_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_group_id UUID;
  v_previous_balance NUMERIC;
  v_new_balance NUMERIC;
  v_tx_id UUID;
  v_entity_type TEXT;
  v_entity_id UUID;
  v_entity_name TEXT;
  v_tx_type TEXT;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Amount must be positive'
    );
  END IF;

  -- Validate source_type
  IF p_source_type NOT IN ('training_session', 'sales_order', 'admin_panel', 'system') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid source_type'
    );
  END IF;

  -- Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_tx_id FROM credit_transactions WHERE idempotency_key = p_idempotency_key;
    IF v_tx_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_tx_id,
        'message', 'Duplicate request - transaction already exists',
        'duplicate', true
      );
    END IF;
  END IF;

  -- Get current user
  v_user_id := auth.uid();

  -- Determine transaction type based on source
  v_tx_type := CASE 
    WHEN p_source_type = 'training_session' THEN 'training'
    WHEN p_source_type = 'sales_order' THEN 'product'
    ELSE 'manual'
  END;

  -- Check if client is in a budget group
  SELECT cbm.group_id, cbg.name INTO v_group_id, v_entity_name
  FROM client_budget_members cbm
  JOIN client_budget_groups cbg ON cbg.id = cbm.group_id
  WHERE cbm.client_id = p_client_id;

  IF v_group_id IS NOT NULL THEN
    v_entity_type := 'group';
    v_entity_id := v_group_id;
    
    SELECT COALESCE(balance_after, 0) INTO v_previous_balance
    FROM credit_transactions
    WHERE group_id = v_group_id AND status = 'completed'
    ORDER BY created_at DESC, id DESC
    LIMIT 1;
  ELSE
    v_entity_type := 'client';
    v_entity_id := p_client_id;
    
    SELECT name INTO v_entity_name FROM clients WHERE id = p_client_id;
    
    SELECT COALESCE(balance_after, 0) INTO v_previous_balance
    FROM credit_transactions
    WHERE client_id = p_client_id AND group_id IS NULL AND status = 'completed'
    ORDER BY created_at DESC, id DESC
    LIMIT 1;
  END IF;

  v_previous_balance := COALESCE(v_previous_balance, 0);
  v_new_balance := v_previous_balance - p_amount;

  -- Insert transaction (negative amount for deduction)
  INSERT INTO credit_transactions (
    client_id,
    amount,
    type,
    description,
    payment_method,
    user_id,
    group_id,
    status,
    source_type,
    source_id,
    balance_after,
    idempotency_key,
    training_session_id
  ) VALUES (
    p_client_id,
    -p_amount,
    v_tx_type,
    COALESCE(p_description, 'Odečet kreditu'),
    'credit',
    v_user_id,
    v_group_id,
    'completed',
    p_source_type,
    p_source_id,
    v_new_balance,
    p_idempotency_key,
    CASE WHEN p_source_type = 'training_session' THEN p_source_id ELSE NULL END
  )
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'balance', jsonb_build_object(
      'entity_type', v_entity_type,
      'entity_id', v_entity_id,
      'entity_name', v_entity_name,
      'new_balance', v_new_balance,
      'previous_balance', v_previous_balance,
      'delta', -p_amount
    ),
    'message', format('Kredit snížen o %s Kč', p_amount),
    'timestamp', now()
  );
END;
$$;

-- 4.3: rpc_credit_refund - Refund/reversal (canceled training, storno)
CREATE OR REPLACE FUNCTION rpc_credit_refund(
  p_original_transaction_id UUID,
  p_reason TEXT DEFAULT 'Vratka'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_original_tx RECORD;
  v_group_id UUID;
  v_previous_balance NUMERIC;
  v_new_balance NUMERIC;
  v_tx_id UUID;
  v_entity_type TEXT;
  v_entity_id UUID;
  v_entity_name TEXT;
BEGIN
  -- Get original transaction
  SELECT * INTO v_original_tx FROM credit_transactions WHERE id = p_original_transaction_id;
  
  IF v_original_tx IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Original transaction not found'
    );
  END IF;

  -- Check if already refunded (look for existing refund with this as source_id)
  IF EXISTS (
    SELECT 1 FROM credit_transactions 
    WHERE source_type = 'refund' AND source_id = p_original_transaction_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transaction already refunded'
    );
  END IF;

  v_user_id := auth.uid();
  v_group_id := v_original_tx.group_id;

  -- Get entity info and previous balance
  IF v_group_id IS NOT NULL THEN
    v_entity_type := 'group';
    v_entity_id := v_group_id;
    SELECT name INTO v_entity_name FROM client_budget_groups WHERE id = v_group_id;
    
    SELECT COALESCE(balance_after, 0) INTO v_previous_balance
    FROM credit_transactions
    WHERE group_id = v_group_id AND status = 'completed'
    ORDER BY created_at DESC, id DESC
    LIMIT 1;
  ELSE
    v_entity_type := 'client';
    v_entity_id := v_original_tx.client_id;
    SELECT name INTO v_entity_name FROM clients WHERE id = v_original_tx.client_id;
    
    SELECT COALESCE(balance_after, 0) INTO v_previous_balance
    FROM credit_transactions
    WHERE client_id = v_original_tx.client_id AND group_id IS NULL AND status = 'completed'
    ORDER BY created_at DESC, id DESC
    LIMIT 1;
  END IF;

  v_previous_balance := COALESCE(v_previous_balance, 0);
  -- Refund reverses the original amount
  v_new_balance := v_previous_balance - v_original_tx.amount;

  -- Insert refund transaction
  INSERT INTO credit_transactions (
    client_id,
    amount,
    type,
    description,
    payment_method,
    user_id,
    group_id,
    status,
    source_type,
    source_id,
    balance_after,
    reference_id
  ) VALUES (
    v_original_tx.client_id,
    -v_original_tx.amount,  -- Reverse the original amount
    'canceled_training',
    p_reason,
    'credit',
    v_user_id,
    v_group_id,
    'completed',
    'refund',
    p_original_transaction_id,
    v_new_balance,
    v_original_tx.id::text
  )
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'original_transaction_id', p_original_transaction_id,
    'balance', jsonb_build_object(
      'entity_type', v_entity_type,
      'entity_id', v_entity_id,
      'entity_name', v_entity_name,
      'new_balance', v_new_balance,
      'previous_balance', v_previous_balance,
      'delta', -v_original_tx.amount
    ),
    'message', format('Vráceno %s Kč', ABS(v_original_tx.amount)),
    'timestamp', now()
  );
END;
$$;

-- 4.4: rpc_credit_transfer - Transfer between accounts
CREATE OR REPLACE FUNCTION rpc_credit_transfer(
  p_from_client_id UUID,
  p_to_client_id UUID,
  p_amount NUMERIC,
  p_reason TEXT DEFAULT 'Převod'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_from_result JSONB;
  v_to_result JSONB;
  v_deduct_tx_id UUID;
  v_add_tx_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;

  IF p_from_client_id = p_to_client_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot transfer to same account');
  END IF;

  v_user_id := auth.uid();

  -- Deduct from source
  SELECT rpc_credit_deduct(
    p_from_client_id, 
    p_amount, 
    'admin_panel',
    NULL,
    format('Převod na jiný účet: %s', p_reason)
  ) INTO v_from_result;

  IF NOT (v_from_result->>'success')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to deduct from source: ' || (v_from_result->>'error')
    );
  END IF;

  v_deduct_tx_id := (v_from_result->>'transaction_id')::uuid;

  -- Add to destination
  SELECT rpc_credit_add(
    p_to_client_id,
    p_amount,
    'credit',
    format('Převod z jiného účtu: %s', p_reason)
  ) INTO v_to_result;

  IF NOT (v_to_result->>'success')::boolean THEN
    -- Rollback the deduction by creating a refund
    PERFORM rpc_credit_refund(v_deduct_tx_id, 'Rollback - transfer failed');
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to add to destination: ' || (v_to_result->>'error')
    );
  END IF;

  v_add_tx_id := (v_to_result->>'transaction_id')::uuid;

  -- Link the transactions
  UPDATE credit_transactions SET source_type = 'transfer', source_id = v_deduct_tx_id WHERE id = v_add_tx_id;
  UPDATE credit_transactions SET source_type = 'transfer', source_id = v_add_tx_id WHERE id = v_deduct_tx_id;

  RETURN jsonb_build_object(
    'success', true,
    'from_transaction_id', v_deduct_tx_id,
    'to_transaction_id', v_add_tx_id,
    'from_balance', v_from_result->'balance',
    'to_balance', v_to_result->'balance',
    'amount', p_amount,
    'message', format('Převedeno %s Kč', p_amount),
    'timestamp', now()
  );
END;
$$;

-- Phase 5: View for quick balance lookup (from running balance)
-- ============================================================

CREATE OR REPLACE VIEW vw_running_balances AS
WITH latest_client_tx AS (
  SELECT DISTINCT ON (client_id)
    client_id,
    balance_after,
    created_at
  FROM credit_transactions
  WHERE group_id IS NULL AND status = 'completed' AND balance_after IS NOT NULL
  ORDER BY client_id, created_at DESC, id DESC
),
latest_group_tx AS (
  SELECT DISTINCT ON (group_id)
    group_id,
    balance_after,
    created_at
  FROM credit_transactions
  WHERE group_id IS NOT NULL AND status = 'completed' AND balance_after IS NOT NULL
  ORDER BY group_id, created_at DESC, id DESC
)
SELECT 
  'client' as entity_type,
  client_id as entity_id,
  COALESCE(balance_after, 0) as current_balance,
  created_at as last_updated
FROM latest_client_tx
UNION ALL
SELECT 
  'group' as entity_type,
  group_id as entity_id,
  COALESCE(balance_after, 0) as current_balance,
  created_at as last_updated
FROM latest_group_tx;

-- Phase 6: Enable Realtime for credit_transactions
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_transactions;

-- Phase 7: Audit function to verify running balances match ledger
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_audit_running_balances()
RETURNS TABLE(
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  running_balance NUMERIC,
  ledger_balance NUMERIC,
  discrepancy NUMERIC,
  needs_fix BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  -- Check individual clients
  SELECT 
    'client'::TEXT as entity_type,
    c.id as entity_id,
    c.name as entity_name,
    COALESCE(rb.current_balance, 0) as running_balance,
    COALESCE(lb.ledger_balance, 0) as ledger_balance,
    COALESCE(rb.current_balance, 0) - COALESCE(lb.ledger_balance, 0) as discrepancy,
    ABS(COALESCE(rb.current_balance, 0) - COALESCE(lb.ledger_balance, 0)) > 0.01 as needs_fix
  FROM clients c
  LEFT JOIN vw_running_balances rb ON rb.entity_id = c.id AND rb.entity_type = 'client'
  LEFT JOIN vw_client_ledger_balances lb ON lb.client_id = c.id
  WHERE NOT EXISTS (SELECT 1 FROM client_budget_members cbm WHERE cbm.client_id = c.id)
  
  UNION ALL
  
  -- Check groups
  SELECT 
    'group'::TEXT as entity_type,
    g.id as entity_id,
    g.name as entity_name,
    COALESCE(rb.current_balance, 0) as running_balance,
    COALESCE(gb.ledger_balance, 0) as ledger_balance,
    COALESCE(rb.current_balance, 0) - COALESCE(gb.ledger_balance, 0) as discrepancy,
    ABS(COALESCE(rb.current_balance, 0) - COALESCE(gb.ledger_balance, 0)) > 0.01 as needs_fix
  FROM client_budget_groups g
  LEFT JOIN vw_running_balances rb ON rb.entity_id = g.id AND rb.entity_type = 'group'
  LEFT JOIN vw_group_ledger_balances gb ON gb.group_id = g.id;
END;
$$;

-- Phase 8: Backfill all existing transactions with running balances
-- ============================================================

-- Backfill for all individual clients
DO $$
DECLARE
  v_client_id UUID;
BEGIN
  FOR v_client_id IN 
    SELECT DISTINCT client_id 
    FROM credit_transactions 
    WHERE group_id IS NULL AND balance_after IS NULL
  LOOP
    PERFORM rpc_recalculate_running_balances(v_client_id, NULL);
  END LOOP;
END;
$$;

-- Backfill for all groups
DO $$
DECLARE
  v_group_id UUID;
BEGIN
  FOR v_group_id IN 
    SELECT DISTINCT group_id 
    FROM credit_transactions 
    WHERE group_id IS NOT NULL AND balance_after IS NULL
  LOOP
    PERFORM rpc_recalculate_running_balances(NULL, v_group_id);
  END LOOP;
END;
$$;