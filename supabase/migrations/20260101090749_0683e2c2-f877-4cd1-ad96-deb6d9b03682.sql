-- Add discount columns to sales_orders
ALTER TABLE public.sales_orders 
ADD COLUMN IF NOT EXISTS products_subtotal NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS services_subtotal NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS order_discount_type TEXT CHECK (order_discount_type IS NULL OR order_discount_type IN ('percent', 'fixed')),
ADD COLUMN IF NOT EXISTS order_discount_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS order_discount_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_discount NUMERIC DEFAULT 0;

-- Add discount columns to sales_order_items
ALTER TABLE public.sales_order_items
ADD COLUMN IF NOT EXISTS line_discount_type TEXT CHECK (line_discount_type IS NULL OR line_discount_type IN ('percent', 'fixed')),
ADD COLUMN IF NOT EXISTS line_discount_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS line_total_after_discount NUMERIC;

-- Update existing rows to have line_total_after_discount = line_total
UPDATE public.sales_order_items 
SET line_total_after_discount = line_total 
WHERE line_total_after_discount IS NULL;

-- Create or replace the updated rpc_process_sale function
CREATE OR REPLACE FUNCTION public.rpc_process_sale(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_client_id uuid;
  v_group_id uuid;
  v_payment_method text;
  v_notes text;
  v_items jsonb;
  v_idempotency_key text;
  v_order_id uuid;
  v_item jsonb;
  v_product record;
  v_products_subtotal numeric := 0;
  v_services_subtotal numeric := 0;
  v_total_amount numeric := 0;
  v_line_total numeric;
  v_credit_delta numeric := 0;
  v_total_credit_delta numeric := 0;
  v_existing_order_id uuid;
  v_order_discount_type text;
  v_order_discount_value numeric := 0;
  v_order_discount_amount numeric := 0;
  v_total_discount numeric := 0;
  v_item_discounts jsonb;
  v_line_discount_type text;
  v_line_discount_value numeric;
  v_line_discount_amount numeric;
  v_line_total_after_discount numeric;
  v_product_id uuid;
BEGIN
  -- Extract payload fields
  v_user_id := (payload->>'user_id')::uuid;
  v_client_id := NULLIF(payload->>'client_id', '')::uuid;
  v_group_id := NULLIF(payload->>'group_id', '')::uuid;
  v_payment_method := payload->>'payment_method';
  v_notes := payload->>'notes';
  v_items := payload->'items';
  v_idempotency_key := payload->>'idempotency_key';
  v_order_discount_type := payload->'order_discount'->>'type';
  v_order_discount_value := COALESCE((payload->'order_discount'->>'value')::numeric, 0);
  v_item_discounts := COALESCE(payload->'item_discounts', '[]'::jsonb);

  -- Validate required fields
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_id is required');
  END IF;

  IF v_payment_method IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'payment_method is required');
  END IF;

  IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'items array is required and cannot be empty');
  END IF;

  -- Credit payment requires client or group
  IF v_payment_method = 'credit' AND v_client_id IS NULL AND v_group_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'credit payment requires client_id or group_id');
  END IF;

  -- Check idempotency
  IF v_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_order_id
    FROM sales_orders
    WHERE idempotency_key = v_idempotency_key;
    
    IF v_existing_order_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true, 
        'order_id', v_existing_order_id, 
        'message', 'Order already processed (idempotent)'
      );
    END IF;
  END IF;

  -- First pass: calculate subtotals (products vs services)
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    
    SELECT * INTO v_product
    FROM products
    WHERE id = v_product_id;

    IF v_product IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Product not found: ' || v_product_id);
    END IF;

    v_line_total := v_product.price * COALESCE((v_item->>'quantity')::integer, 1);
    
    -- Separate products from services (services and credit_topup don't get discounts)
    IF v_product.kind = 'inventory' THEN
      v_products_subtotal := v_products_subtotal + v_line_total;
    ELSE
      v_services_subtotal := v_services_subtotal + v_line_total;
    END IF;
  END LOOP;

  -- Calculate order-level discount (only applies to products)
  IF v_order_discount_type = 'percent' AND v_order_discount_value > 0 THEN
    v_order_discount_amount := ROUND(v_products_subtotal * (v_order_discount_value / 100), 2);
  ELSIF v_order_discount_type = 'fixed' AND v_order_discount_value > 0 THEN
    v_order_discount_amount := LEAST(v_order_discount_value, v_products_subtotal);
  END IF;

  -- Create the order
  INSERT INTO sales_orders (
    user_id, 
    client_id, 
    group_id, 
    payment_method, 
    notes, 
    idempotency_key,
    products_subtotal,
    services_subtotal,
    order_discount_type,
    order_discount_value,
    order_discount_amount,
    total_discount,
    total_amount,
    status
  ) VALUES (
    v_user_id, 
    v_client_id, 
    v_group_id, 
    v_payment_method, 
    v_notes, 
    v_idempotency_key,
    v_products_subtotal,
    v_services_subtotal,
    v_order_discount_type,
    v_order_discount_value,
    v_order_discount_amount,
    0, -- will update after calculating line discounts
    0, -- will update after all calculations
    'completed'
  ) RETURNING id INTO v_order_id;

  -- Second pass: process items with line discounts
  v_total_discount := v_order_discount_amount;
  
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    
    SELECT * INTO v_product
    FROM products
    WHERE id = v_product_id;

    v_line_total := v_product.price * COALESCE((v_item->>'quantity')::integer, 1);
    v_line_discount_type := NULL;
    v_line_discount_value := 0;
    v_line_discount_amount := 0;
    v_line_total_after_discount := v_line_total;

    -- Check for line-level discount (only for inventory products)
    IF v_product.kind = 'inventory' THEN
      SELECT 
        elem->>'type',
        COALESCE((elem->>'value')::numeric, 0)
      INTO v_line_discount_type, v_line_discount_value
      FROM jsonb_array_elements(v_item_discounts) elem
      WHERE (elem->>'product_id')::uuid = v_product_id
      LIMIT 1;

      IF v_line_discount_type = 'percent' AND v_line_discount_value > 0 THEN
        v_line_discount_amount := ROUND(v_line_total * (v_line_discount_value / 100), 2);
      ELSIF v_line_discount_type = 'fixed' AND v_line_discount_value > 0 THEN
        v_line_discount_amount := LEAST(v_line_discount_value, v_line_total);
      END IF;

      v_line_total_after_discount := v_line_total - v_line_discount_amount;
      v_total_discount := v_total_discount + v_line_discount_amount;
    END IF;

    -- Insert order item
    INSERT INTO sales_order_items (
      order_id,
      product_id,
      quantity,
      unit_price,
      line_total,
      line_discount_type,
      line_discount_value,
      line_discount_amount,
      line_total_after_discount
    ) VALUES (
      v_order_id,
      v_product_id,
      COALESCE((v_item->>'quantity')::integer, 1),
      v_product.price,
      v_line_total,
      v_line_discount_type,
      v_line_discount_value,
      v_line_discount_amount,
      v_line_total_after_discount
    );

    -- Update stock for inventory products
    IF v_product.kind = 'inventory' THEN
      UPDATE products
      SET stock_quantity = stock_quantity - COALESCE((v_item->>'quantity')::integer, 1),
          updated_at = now()
      WHERE id = v_product_id;
    END IF;

    -- Track credit delta for credit products
    IF v_product.kind = 'credit_topup' AND v_product.credit_delta > 0 THEN
      v_total_credit_delta := v_total_credit_delta + (v_product.credit_delta * COALESCE((v_item->>'quantity')::integer, 1));
    END IF;
  END LOOP;

  -- Calculate final total: (products - total_discount) + services
  -- But ensure discount doesn't exceed products_subtotal
  v_total_discount := LEAST(v_total_discount, v_products_subtotal);
  v_total_amount := (v_products_subtotal - v_total_discount) + v_services_subtotal;

  -- Update order with final totals
  UPDATE sales_orders
  SET total_discount = v_total_discount,
      total_amount = v_total_amount
  WHERE id = v_order_id;

  -- Handle credit payment
  IF v_payment_method = 'credit' THEN
    IF v_group_id IS NOT NULL THEN
      -- Deduct from group balance
      UPDATE client_budget_groups
      SET shared_balance = COALESCE(shared_balance, 0) - v_total_amount,
          updated_at = now()
      WHERE id = v_group_id;
      
      -- Create credit transaction for group
      INSERT INTO credit_transactions (
        client_id,
        group_id,
        user_id,
        amount,
        type,
        description,
        payment_method,
        sale_order_id,
        status
      ) VALUES (
        COALESCE(v_client_id, (SELECT client_id FROM client_budget_members WHERE group_id = v_group_id LIMIT 1)),
        v_group_id,
        v_user_id,
        -v_total_amount,
        'sale',
        'Prodej #' || v_order_id::text,
        v_payment_method,
        v_order_id,
        'completed'
      );
    ELSIF v_client_id IS NOT NULL THEN
      -- Deduct from client balance
      UPDATE clients
      SET credit_balance = COALESCE(credit_balance, 0) - v_total_amount,
          updated_at = now()
      WHERE id = v_client_id;
      
      -- Create credit transaction
      INSERT INTO credit_transactions (
        client_id,
        user_id,
        amount,
        type,
        description,
        payment_method,
        sale_order_id,
        status
      ) VALUES (
        v_client_id,
        v_user_id,
        -v_total_amount,
        'sale',
        'Prodej #' || v_order_id::text,
        v_payment_method,
        v_order_id,
        'completed'
      );
    END IF;
  END IF;

  -- Handle credit top-up
  IF v_total_credit_delta > 0 AND v_client_id IS NOT NULL THEN
    UPDATE clients
    SET credit_balance = COALESCE(credit_balance, 0) + v_total_credit_delta,
        updated_at = now()
    WHERE id = v_client_id;
    
    INSERT INTO credit_transactions (
      client_id,
      user_id,
      amount,
      type,
      description,
      payment_method,
      sale_order_id,
      status
    ) VALUES (
      v_client_id,
      v_user_id,
      v_total_credit_delta,
      'topup',
      'Dobití kreditu z prodeje #' || v_order_id::text,
      v_payment_method,
      v_order_id,
      'completed'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'total_amount', v_total_amount,
    'products_subtotal', v_products_subtotal,
    'services_subtotal', v_services_subtotal,
    'total_discount', v_total_discount,
    'credit_delta', v_total_credit_delta
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;