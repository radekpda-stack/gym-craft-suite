-- Create function to update sales order payment methods with proper credit recalculation
CREATE OR REPLACE FUNCTION rpc_update_sale_payment(
  p_order_id uuid,
  p_order_payment_method text,
  p_item_payments jsonb DEFAULT NULL -- Array of {itemId, paymentMethod}
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_old_credit_amount numeric := 0;
  v_new_credit_amount numeric := 0;
  v_item record;
  v_item_payment record;
  v_credit_diff numeric;
  v_has_split_payments boolean := false;
BEGIN
  -- Get the order
  SELECT * INTO v_order
  FROM sales_orders
  WHERE id = p_order_id;

  IF v_order IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Calculate old credit amount (what was paid from credit before)
  IF v_order.payment_method = 'credit' THEN
    v_old_credit_amount := v_order.total_amount;
  END IF;

  -- Check if we have split payments
  v_has_split_payments := p_item_payments IS NOT NULL AND jsonb_array_length(p_item_payments) > 0;

  -- Update order payment method
  UPDATE sales_orders
  SET payment_method = p_order_payment_method,
      updated_at = now()
  WHERE id = p_order_id;

  -- Update item payment methods
  IF v_has_split_payments THEN
    -- Clear all item payment methods first
    UPDATE sales_order_items
    SET payment_method = NULL
    WHERE order_id = p_order_id;

    -- Set individual item payment methods
    FOR v_item_payment IN 
      SELECT 
        (elem->>'itemId')::uuid as item_id,
        elem->>'paymentMethod' as payment_method
      FROM jsonb_array_elements(p_item_payments) as elem
    LOOP
      UPDATE sales_order_items
      SET payment_method = v_item_payment.payment_method
      WHERE id = v_item_payment.item_id;
    END LOOP;

    -- Calculate new credit amount from items
    FOR v_item IN 
      SELECT 
        soi.id,
        COALESCE(soi.payment_method, p_order_payment_method) as effective_payment_method,
        COALESCE(soi.line_total_after_discount, soi.line_total) as amount
      FROM sales_order_items soi
      WHERE soi.order_id = p_order_id
    LOOP
      IF v_item.effective_payment_method = 'credit' THEN
        v_new_credit_amount := v_new_credit_amount + v_item.amount;
      END IF;
    END LOOP;
  ELSE
    -- Clear all item payment methods
    UPDATE sales_order_items
    SET payment_method = NULL
    WHERE order_id = p_order_id;

    -- Calculate new credit amount from order level
    IF p_order_payment_method = 'credit' THEN
      v_new_credit_amount := v_order.total_amount;
    END IF;
  END IF;

  -- Calculate the difference in credit
  v_credit_diff := v_new_credit_amount - v_old_credit_amount;

  -- If credit changed, update client balance and transactions
  IF v_credit_diff != 0 AND v_order.client_id IS NOT NULL THEN
    -- Delete old credit transaction for this order
    DELETE FROM credit_transactions
    WHERE sale_order_id = p_order_id
      AND type = 'product';

    -- Update client balance (subtract old, add new = net difference)
    UPDATE clients
    SET credit_balance = COALESCE(credit_balance, 0) - v_credit_diff,
        updated_at = now()
    WHERE id = v_order.client_id;

    -- Create new credit transaction if there's credit payment
    IF v_new_credit_amount > 0 THEN
      INSERT INTO credit_transactions (
        user_id,
        client_id,
        amount,
        type,
        payment_method,
        description,
        sale_order_id,
        status
      ) VALUES (
        v_order.user_id,
        v_order.client_id,
        -v_new_credit_amount,
        'product',
        'credit',
        'Nákup z kreditu',
        p_order_id,
        'completed'
      );
    END IF;
  ELSIF v_credit_diff != 0 AND v_order.group_id IS NOT NULL THEN
    -- Handle group credit
    DELETE FROM credit_transactions
    WHERE sale_order_id = p_order_id
      AND type = 'product';

    UPDATE client_budget_groups
    SET shared_balance = COALESCE(shared_balance, 0) - v_credit_diff,
        updated_at = now()
    WHERE id = v_order.group_id;

    IF v_new_credit_amount > 0 THEN
      INSERT INTO credit_transactions (
        user_id,
        group_id,
        amount,
        type,
        payment_method,
        description,
        sale_order_id,
        status
      ) VALUES (
        v_order.user_id,
        v_order.group_id,
        -v_new_credit_amount,
        'product',
        'credit',
        'Nákup ze skupinového kreditu',
        p_order_id,
        'completed'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'old_credit_amount', v_old_credit_amount,
    'new_credit_amount', v_new_credit_amount,
    'credit_diff', v_credit_diff,
    'has_split_payments', v_has_split_payments
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;