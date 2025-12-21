-- Create atomic function for updating shared budget balance
-- This prevents race conditions by using a single atomic UPDATE with RETURNING
CREATE OR REPLACE FUNCTION update_shared_balance_atomic(
  p_group_id UUID,
  p_delta NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  UPDATE client_budget_groups
  SET shared_balance = COALESCE(shared_balance, 0) + p_delta,
      updated_at = now()
  WHERE id = p_group_id
  RETURNING shared_balance INTO v_new_balance;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Budget group not found: %', p_group_id;
  END IF;
  
  RETURN v_new_balance;
END;
$$;

-- Create atomic function for updating client credit balance
CREATE OR REPLACE FUNCTION update_client_balance_atomic(
  p_client_id UUID,
  p_delta NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  UPDATE clients
  SET credit_balance = COALESCE(credit_balance, 0) + p_delta,
      updated_at = now()
  WHERE id = p_client_id
  RETURNING credit_balance INTO v_new_balance;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client not found: %', p_client_id;
  END IF;
  
  RETURN v_new_balance;
END;
$$;