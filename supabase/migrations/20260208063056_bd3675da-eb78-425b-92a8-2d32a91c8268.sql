-- ============================================================
-- Credit System Validation RPC
-- Pre-operation validation to prevent unauthorized debt
-- ============================================================

-- Function to validate credit operation before execution
CREATE OR REPLACE FUNCTION rpc_validate_credit_operation(
  p_client_id UUID,
  p_amount NUMERIC,
  p_operation TEXT  -- 'deduct' | 'add'
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_after_balance NUMERIC;
  v_max_debt NUMERIC := -10000;  -- Maximum allowed debt
  v_group_id UUID;
BEGIN
  -- Check if client is in a budget group
  SELECT group_id INTO v_group_id
  FROM client_budget_members
  WHERE client_id = p_client_id;

  IF v_group_id IS NOT NULL THEN
    -- Get group balance from running balance
    SELECT balance_after INTO v_current_balance
    FROM credit_transactions
    WHERE group_id = v_group_id
      AND status = 'completed'
    ORDER BY created_at DESC, id DESC
    LIMIT 1;
  ELSE
    -- Get individual balance from running balance
    SELECT balance_after INTO v_current_balance
    FROM credit_transactions
    WHERE client_id = p_client_id
      AND group_id IS NULL
      AND status = 'completed'
    ORDER BY created_at DESC, id DESC
    LIMIT 1;
  END IF;
  
  v_current_balance := COALESCE(v_current_balance, 0);
  
  -- Calculate balance after operation
  IF p_operation = 'deduct' THEN
    v_after_balance := v_current_balance - ABS(p_amount);
  ELSE
    v_after_balance := v_current_balance + ABS(p_amount);
  END IF;
  
  RETURN jsonb_build_object(
    'valid', v_after_balance >= v_max_debt,
    'current_balance', v_current_balance,
    'after_balance', v_after_balance,
    'exceeds_limit', v_after_balance < v_max_debt,
    'max_debt', v_max_debt,
    'is_group', v_group_id IS NOT NULL,
    'group_id', v_group_id
  );
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION rpc_validate_credit_operation TO authenticated;

-- Add debt limit validation to rpc_credit_deduct
CREATE OR REPLACE FUNCTION rpc_credit_deduct(
  p_client_id UUID,
  p_amount NUMERIC,
  p_source_type TEXT,
  p_source_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id UUID;
  v_group_id UUID;
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_client_name TEXT;
  v_max_debt NUMERIC := -10000;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Amount must be positive'
    );
  END IF;

  -- Check for idempotency
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_transaction_id
    FROM credit_transactions
    WHERE idempotency_key = p_idempotency_key;
    
    IF v_transaction_id IS NOT NULL THEN
      -- Return existing transaction
      SELECT balance_after INTO v_new_balance
      FROM credit_transactions
      WHERE id = v_transaction_id;
      
      RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'balance', jsonb_build_object('new_balance', v_new_balance, 'delta', -p_amount),
        'message', 'Transaction already processed (idempotent)',
        'idempotent', true
      );
    END IF;
  END IF;

  -- Get client name
  SELECT name INTO v_client_name
  FROM clients
  WHERE id = p_client_id;

  -- Check if client is in a budget group
  SELECT group_id INTO v_group_id
  FROM client_budget_members
  WHERE client_id = p_client_id;

  -- Get current balance
  IF v_group_id IS NOT NULL THEN
    SELECT balance_after INTO v_current_balance
    FROM credit_transactions
    WHERE group_id = v_group_id
      AND status = 'completed'
    ORDER BY created_at DESC, id DESC
    LIMIT 1;
  ELSE
    SELECT balance_after INTO v_current_balance
    FROM credit_transactions
    WHERE client_id = p_client_id
      AND group_id IS NULL
      AND status = 'completed'
    ORDER BY created_at DESC, id DESC
    LIMIT 1;
  END IF;

  v_current_balance := COALESCE(v_current_balance, 0);
  v_new_balance := v_current_balance - p_amount;

  -- Validate debt limit
  IF v_new_balance < v_max_debt THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Překročen maximální povolený dluh (%s Kč). Aktuální zůstatek: %s Kč', v_max_debt, v_current_balance),
      'current_balance', v_current_balance,
      'requested_amount', p_amount,
      'would_result_in', v_new_balance,
      'max_debt', v_max_debt
    );
  END IF;

  -- Insert transaction
  INSERT INTO credit_transactions (
    client_id,
    group_id,
    amount,
    type,
    description,
    status,
    source_type,
    source_id,
    balance_after,
    idempotency_key
  ) VALUES (
    p_client_id,
    v_group_id,
    -p_amount,  -- Negative for deduction
    'deduct',
    COALESCE(p_description, 'Odečtení kreditu'),
    'completed',
    p_source_type,
    p_source_id,
    v_new_balance,
    p_idempotency_key
  )
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'balance', jsonb_build_object(
      'entity_type', CASE WHEN v_group_id IS NOT NULL THEN 'group' ELSE 'client' END,
      'entity_id', COALESCE(v_group_id, p_client_id),
      'entity_name', v_client_name,
      'new_balance', v_new_balance,
      'delta', -p_amount
    ),
    'message', format('Odečteno %s Kč z účtu %s', p_amount, v_client_name),
    'timestamp', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_credit_deduct TO authenticated;