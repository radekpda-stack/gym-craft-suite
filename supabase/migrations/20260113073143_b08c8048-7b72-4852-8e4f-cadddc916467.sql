
-- Fix rpc_add_credit_lot to also create a credit_transaction for consistency
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
  
  -- Update credit_balance for backward compatibility
  IF v_group_id IS NOT NULL THEN
    -- Update shared budget balance
    UPDATE public.client_budget_groups
    SET shared_balance = COALESCE(shared_balance, 0) + p_amount_czk,
        updated_at = now()
    WHERE id = v_group_id;
  ELSE
    -- Update individual client balance
    UPDATE public.clients
    SET credit_balance = COALESCE(credit_balance, 0) + p_amount_czk,
        updated_at = now()
    WHERE id = p_client_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'lot_id', v_lot_id,
    'price_list_id', v_price_list_id,
    'amount', p_amount_czk
  );
END;
$$;
