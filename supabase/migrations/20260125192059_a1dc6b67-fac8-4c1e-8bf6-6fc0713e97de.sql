-- Fix double counting in rpc_add_credit_lot by removing manual balance UPDATE
-- The trigger 'sync_balance_after_transaction' already handles balance updates
-- when INSERT into credit_transactions occurs

CREATE OR REPLACE FUNCTION public.rpc_add_credit_lot(
  p_client_id UUID,
  p_amount_czk NUMERIC,
  p_source TEXT,
  p_note TEXT,
  p_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price_list_id UUID;
  v_lot_id UUID;
  v_group_id UUID;
BEGIN
  -- Determine price list based on current date
  v_price_list_id := public.rpc_get_current_price_list();
  
  IF v_price_list_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nenalezen aktivní ceník');
  END IF;
  
  -- Check if client is in a budget group
  SELECT group_id INTO v_group_id 
  FROM client_budget_members 
  WHERE client_id = p_client_id;
  
  -- Create new lot
  INSERT INTO public.credit_lots (
    client_id, price_list_id, balance_czk_original, balance_czk_remaining,
    source, note, user_id, created_by
  ) VALUES (
    p_client_id, v_price_list_id, p_amount_czk, p_amount_czk,
    p_source, p_note, p_user_id, p_user_id
  )
  RETURNING id INTO v_lot_id;
  
  -- Create credit_transaction for ledger tracking
  -- NOTE: The trigger 'sync_balance_after_transaction' will automatically
  -- update shared_balance (for groups) or credit_balance (for individuals)
  INSERT INTO public.credit_transactions (
    client_id,
    amount,
    type,
    description,
    payment_method,
    user_id,
    group_id
  ) VALUES (
    p_client_id,
    p_amount_czk,
    'payment',
    COALESCE(p_note, 'Dobití kreditu'),
    'credit',
    p_user_id,
    v_group_id
  );
  
  -- REMOVED: Manual balance update was causing double counting
  -- The trigger handles this automatically after INSERT into credit_transactions
  
  RETURN jsonb_build_object(
    'success', true,
    'lot_id', v_lot_id,
    'price_list_id', v_price_list_id,
    'amount', p_amount_czk
  );
END;
$$;

-- Correct existing discrepancies in group balances
-- These values are based on ledger_sum from vw_group_ledger_balances

-- Fix group "Rom" (Roman Lázinka) - ledger shows 10200, stored was 20200
UPDATE client_budget_groups 
SET shared_balance = 10200, updated_at = now()
WHERE id = 'ea89a870-cabc-4997-955e-63299b3ec0f9';

-- Fix group "Dolák" - ledger shows 2065, stored was 2565
UPDATE client_budget_groups 
SET shared_balance = 2065, updated_at = now()
WHERE id = '3e422ba8-7e8c-4af0-a12f-8ef270692281';

-- Fix group "Kou" - ledger shows 4800, stored was 5600
UPDATE client_budget_groups
SET shared_balance = 4800, updated_at = now()
WHERE id = '018fe8e4-3c52-483d-b88f-f370cef4936c';