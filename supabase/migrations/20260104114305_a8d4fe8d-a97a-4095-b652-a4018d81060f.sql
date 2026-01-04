-- Fix rpc_process_sale to properly award XP by inserting into xp_events and recalculating client_xp

CREATE OR REPLACE FUNCTION rpc_process_sale(payload jsonb)
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
  v_product_id_text text;
  v_xp_earned integer := 0;
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
        'message', 'Order already processed (idempotent)',
        'idempotent', true
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
      RETURN jsonb_build_object('success', false, 'error', 'Product not found: ' || v_product_id::text);
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
    v_order_discount_amount := ROUND(v_products_subtotal * (v_order_discount_value / 100));
  ELSIF v_order_discount_type = 'fixed' AND v_order_discount_value > 0 THEN
    v_order_discount_amount := LEAST(v_order_discount_value, v_products_subtotal);
  END IF;

  -- Calculate XP from product margins (only if client is selected)
  IF v_client_id IS NOT NULL THEN
    v_xp_earned := calculate_sale_xp(v_items);
  END IF;

  -- Create the order
  INSERT INTO sales_orders (
    user_id,
    client_id,
    group_id,
    payment_method,
    note,
    idempotency_key,
    products_subtotal,
    services_subtotal,
    order_discount_type,
    order_discount_value,
    order_discount_amount,
    total_discount,
    total_amount,
    payment_status,
    xp_earned
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
    0,
    0,
    'completed',
    v_xp_earned
  )
  RETURNING id INTO v_order_id;

  -- Second pass: create order items, update stock, calculate line discounts
  v_total_discount := v_order_discount_amount;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_product_id_text := v_product_id::text;

    SELECT * INTO v_product
    FROM products
    WHERE id = v_product_id;

    v_line_total := v_product.price * COALESCE((v_item->>'quantity')::integer, 1);
    v_line_discount_type := NULL;
    v_line_discount_value := 0;
    v_line_discount_amount := 0;
    v_line_total_after_discount := v_line_total;

    -- Item-level discount (only for inventory)
    IF v_product.kind = 'inventory' THEN
      SELECT
        (d->>'type')::text,
        (d->>'value')::numeric
      INTO v_line_discount_type, v_line_discount_value
      FROM jsonb_array_elements(v_item_discounts) d
      WHERE d->>'productId' = v_product_id_text
      LIMIT 1;

      IF v_line_discount_type IS NOT NULL AND v_line_discount_value > 0 THEN
        IF v_line_discount_type = 'percent' THEN
          v_line_discount_amount := ROUND(v_line_total * (v_line_discount_value / 100));
        ELSE
          v_line_discount_amount := LEAST(v_line_discount_value, v_line_total);
        END IF;
        v_line_total_after_discount := v_line_total - v_line_discount_amount;
        v_total_discount := v_total_discount + v_line_discount_amount;
      END IF;
    END IF;

    INSERT INTO sales_order_items (
      order_id,
      product_id,
      name_snapshot,
      unit_price,
      quantity,
      line_total,
      product_kind,
      credit_delta,
      line_discount_type,
      line_discount_value,
      line_discount_amount,
      line_total_after_discount
    ) VALUES (
      v_order_id,
      v_product_id,
      v_product.name,
      v_product.price,
      COALESCE((v_item->>'quantity')::integer, 1),
      v_line_total,
      v_product.kind,
      COALESCE(v_product.credit_delta, 0),
      v_line_discount_type,
      v_line_discount_value,
      v_line_discount_amount,
      v_line_total_after_discount
    );

    IF v_product.kind = 'inventory' THEN
      UPDATE products
      SET stock_quantity = stock_quantity - COALESCE((v_item->>'quantity')::integer, 1),
          updated_at = now()
      WHERE id = v_product_id;
    END IF;

    IF v_product.kind = 'credit_topup' AND v_product.credit_delta > 0 THEN
      v_total_credit_delta := v_total_credit_delta + (v_product.credit_delta * COALESCE((v_item->>'quantity')::integer, 1));
    END IF;
  END LOOP;

  v_total_discount := LEAST(v_total_discount, v_products_subtotal);
  v_total_amount := (v_products_subtotal - v_total_discount) + v_services_subtotal;

  UPDATE sales_orders
  SET total_discount = v_total_discount,
      total_amount = v_total_amount
  WHERE id = v_order_id;

  -- Credit payment
  IF v_payment_method = 'credit' THEN
    IF v_group_id IS NOT NULL THEN
      UPDATE client_budget_groups
      SET shared_balance = COALESCE(shared_balance, 0) - v_total_amount,
          updated_at = now()
      WHERE id = v_group_id;

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
        v_user_id,
        v_group_id,
        -v_total_amount,
        'product',
        'credit',
        'Nákup ze skupinového kreditu',
        v_order_id,
        'completed'
      );
    ELSE
      UPDATE clients
      SET credit_balance = COALESCE(credit_balance, 0) - v_total_amount,
          updated_at = now()
      WHERE id = v_client_id;

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
        v_user_id,
        v_client_id,
        -v_total_amount,
        'product',
        'credit',
        'Nákup z kreditu',
        v_order_id,
        'completed'
      );
    END IF;
  END IF;

  -- Credit topup
  IF v_total_credit_delta > 0 AND v_client_id IS NOT NULL THEN
    UPDATE clients
    SET credit_balance = COALESCE(credit_balance, 0) + v_total_credit_delta,
        updated_at = now()
    WHERE id = v_client_id;

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
      v_user_id,
      v_client_id,
      v_total_credit_delta,
      'topup',
      v_payment_method,
      'Dobití kreditu',
      v_order_id,
      'completed'
    );
  END IF;

  -- Award XP to client (insert into xp_events and recalculate)
  IF v_xp_earned > 0 AND v_client_id IS NOT NULL THEN
    INSERT INTO xp_events (
      client_id,
      source_type,
      source_id,
      xp_amount,
      description,
      meta
    ) VALUES (
      v_client_id,
      'purchase',
      v_order_id,
      v_xp_earned,
      'Nákup ve fitku',
      jsonb_build_object('order_id', v_order_id, 'total_amount', v_total_amount)
    );
    
    -- Recalculate client XP totals
    PERFORM recalculate_client_xp(v_client_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'total_amount', v_total_amount,
    'products_subtotal', v_products_subtotal,
    'services_subtotal', v_services_subtotal,
    'total_discount', v_total_discount,
    'credit_delta', v_total_credit_delta,
    'xp_earned', v_xp_earned
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;