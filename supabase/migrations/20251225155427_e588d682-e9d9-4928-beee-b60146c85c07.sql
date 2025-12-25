-- =============================================
-- SALES MODULE REFACTOR - ATOMIC SALES
-- =============================================

-- 1) CLIENTS: Add system client support
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS system_key text UNIQUE;

-- Create index for system_key lookup
CREATE INDEX IF NOT EXISTS idx_clients_system_key ON public.clients(system_key) WHERE system_key IS NOT NULL;

-- 2) PRODUCTS: Add kind and credit_delta
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'inventory',
ADD COLUMN IF NOT EXISTS credit_delta numeric NOT NULL DEFAULT 0;

-- Add constraint for valid kind values
ALTER TABLE public.products 
ADD CONSTRAINT products_kind_check 
CHECK (kind IN ('inventory', 'service', 'credit_topup'));

-- Add constraint: credit_topup must have credit_delta > 0
ALTER TABLE public.products 
ADD CONSTRAINT products_credit_topup_delta_check 
CHECK (kind != 'credit_topup' OR credit_delta > 0);

-- Update existing products based on category
UPDATE public.products 
SET kind = CASE 
  WHEN category = 'service' THEN 'service' 
  ELSE 'inventory' 
END
WHERE kind = 'inventory' AND category = 'service';

-- 3) SALES_ORDERS: Main order table
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id),
  group_id uuid REFERENCES public.client_budget_groups(id),
  total_amount numeric NOT NULL,
  payment_method text NOT NULL,
  payment_status text NOT NULL DEFAULT 'completed',
  idempotency_key uuid NOT NULL UNIQUE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT sales_orders_payment_method_check 
    CHECK (payment_method IN ('cash', 'card', 'bank', 'credit')),
  CONSTRAINT sales_orders_payment_status_check 
    CHECK (payment_status IN ('pending', 'completed', 'refunded', 'void'))
);

-- Enable RLS
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for sales_orders
CREATE POLICY "Users can view their own sales orders" 
ON public.sales_orders FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sales orders" 
ON public.sales_orders FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sales orders" 
ON public.sales_orders FOR UPDATE 
USING (auth.uid() = user_id);

-- 4) SALES_ORDER_ITEMS: Line items
CREATE TABLE IF NOT EXISTS public.sales_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  name_snapshot text NOT NULL,
  unit_price numeric NOT NULL,
  quantity integer NOT NULL,
  line_total numeric NOT NULL,
  product_kind text NOT NULL,
  credit_delta numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT sales_order_items_quantity_check CHECK (quantity > 0)
);

-- Enable RLS
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for sales_order_items (via order ownership)
CREATE POLICY "Users can view their own order items" 
ON public.sales_order_items FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.sales_orders 
  WHERE id = order_id AND user_id = auth.uid()
));

CREATE POLICY "Users can create their own order items" 
ON public.sales_order_items FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.sales_orders 
  WHERE id = order_id AND user_id = auth.uid()
));

-- 5) CREDIT_TRANSACTIONS: Add sale_order_id and status
ALTER TABLE public.credit_transactions 
ADD COLUMN IF NOT EXISTS sale_order_id uuid REFERENCES public.sales_orders(id),
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed';

-- Add constraint for valid status
ALTER TABLE public.credit_transactions
ADD CONSTRAINT credit_transactions_status_check 
CHECK (status IN ('completed', 'reversed'));

-- 6) INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_sales_orders_user_created 
ON public.sales_orders(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_order_items_order 
ON public.sales_order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_client_created 
ON public.credit_transactions(client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_user_active 
ON public.products(user_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_credit_transactions_sale_order 
ON public.credit_transactions(sale_order_id) WHERE sale_order_id IS NOT NULL;

-- 7) Trigger for updated_at on sales_orders
CREATE TRIGGER update_sales_orders_updated_at
BEFORE UPDATE ON public.sales_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RPC: ATOMIC SALE PROCESSING
-- =============================================

CREATE OR REPLACE FUNCTION public.rpc_process_sale(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid;
  v_client_id uuid;
  v_group_id uuid;
  v_payment_method text;
  v_idempotency_key uuid;
  v_note text;
  v_items jsonb;
  v_order_id uuid;
  v_total_amount numeric := 0;
  v_item record;
  v_product record;
  v_line_total numeric;
  v_total_credit_delta numeric := 0;
  v_has_credit_topup boolean := false;
BEGIN
  -- Extract payload
  v_user_id := (payload->>'user_id')::uuid;
  v_client_id := (payload->>'client_id')::uuid;
  v_group_id := (payload->>'group_id')::uuid;
  v_payment_method := payload->>'payment_method';
  v_idempotency_key := (payload->>'idempotency_key')::uuid;
  v_note := payload->>'note';
  v_items := payload->'items';
  
  -- 1) IDEMPOTENCY CHECK
  SELECT id INTO v_order_id 
  FROM sales_orders 
  WHERE idempotency_key = v_idempotency_key;
  
  IF v_order_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_order_id,
      'idempotent', true,
      'message', 'Order already exists'
    );
  END IF;
  
  -- 2) VALIDATIONS
  IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'Items cannot be empty';
  END IF;
  
  IF v_payment_method NOT IN ('cash', 'card', 'bank', 'credit') THEN
    RAISE EXCEPTION 'Invalid payment method: %', v_payment_method;
  END IF;
  
  IF v_payment_method = 'credit' AND v_client_id IS NULL AND v_group_id IS NULL THEN
    RAISE EXCEPTION 'Credit payment requires client_id or group_id';
  END IF;
  
  -- Generate order_id
  v_order_id := gen_random_uuid();
  
  -- 3) PROCESS ITEMS - First pass: validate and calculate
  FOR v_item IN SELECT * FROM jsonb_to_recordset(v_items) AS x(product_id uuid, quantity integer)
  LOOP
    -- Get product
    SELECT * INTO v_product 
    FROM products 
    WHERE id = v_item.product_id 
      AND is_active = true
      AND user_id = v_user_id;
    
    IF v_product.id IS NULL THEN
      RAISE EXCEPTION 'Product not found or inactive: %', v_item.product_id;
    END IF;
    
    -- Validate quantity
    IF v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity for product %', v_product.name;
    END IF;
    
    -- Check stock for inventory items
    IF v_product.kind = 'inventory' THEN
      IF COALESCE(v_product.stock_quantity, 0) < v_item.quantity THEN
        RAISE EXCEPTION 'Insufficient stock for %: available %, requested %', 
          v_product.name, COALESCE(v_product.stock_quantity, 0), v_item.quantity;
      END IF;
    END IF;
    
    -- Credit topup validation
    IF v_product.kind = 'credit_topup' THEN
      v_has_credit_topup := true;
      IF v_client_id IS NULL THEN
        RAISE EXCEPTION 'Credit topup requires client_id';
      END IF;
      IF v_payment_method = 'credit' THEN
        RAISE EXCEPTION 'Cannot pay for credit topup with credit';
      END IF;
    END IF;
    
    -- Calculate totals
    v_line_total := v_product.price * v_item.quantity;
    v_total_amount := v_total_amount + v_line_total;
    v_total_credit_delta := v_total_credit_delta + (v_product.credit_delta * v_item.quantity);
  END LOOP;
  
  -- 4) CREATE ORDER
  INSERT INTO sales_orders (
    id, user_id, client_id, group_id, total_amount, 
    payment_method, payment_status, idempotency_key, note
  ) VALUES (
    v_order_id, v_user_id, v_client_id, v_group_id, v_total_amount,
    v_payment_method, 'completed', v_idempotency_key, v_note
  );
  
  -- 5) PROCESS ITEMS - Second pass: insert items, update stock
  FOR v_item IN SELECT * FROM jsonb_to_recordset(v_items) AS x(product_id uuid, quantity integer)
  LOOP
    SELECT * INTO v_product FROM products WHERE id = v_item.product_id;
    v_line_total := v_product.price * v_item.quantity;
    
    -- Insert order item
    INSERT INTO sales_order_items (
      order_id, product_id, name_snapshot, unit_price, 
      quantity, line_total, product_kind, credit_delta
    ) VALUES (
      v_order_id, v_item.product_id, v_product.name, v_product.price,
      v_item.quantity, v_line_total, v_product.kind, v_product.credit_delta
    );
    
    -- Update stock for inventory items
    IF v_product.kind = 'inventory' THEN
      UPDATE products 
      SET stock_quantity = stock_quantity - v_item.quantity,
          updated_at = now()
      WHERE id = v_item.product_id;
    END IF;
  END LOOP;
  
  -- 6) CREDIT EFFECTS
  -- If payment is by credit, deduct from balance
  IF v_payment_method = 'credit' AND v_client_id IS NOT NULL THEN
    -- Create credit transaction for payment
    INSERT INTO credit_transactions (
      client_id, amount, type, description, sale_order_id,
      payment_method, user_id, group_id, status
    ) VALUES (
      v_client_id, -v_total_amount, 'product', 'Platba prodeje',
      v_order_id, 'credit', v_user_id, v_group_id, 'completed'
    );
    
    -- Apply credit delta (deduct)
    PERFORM rpc_apply_credit_delta(v_client_id, -v_total_amount, 'Sale payment', v_order_id);
  END IF;
  
  -- If any items are credit topups, add credit
  IF v_total_credit_delta > 0 AND v_client_id IS NOT NULL THEN
    -- Create credit transaction for topup
    INSERT INTO credit_transactions (
      client_id, amount, type, description, sale_order_id,
      payment_method, user_id, group_id, status
    ) VALUES (
      v_client_id, v_total_credit_delta, 'payment', 'Dobití kreditu',
      v_order_id, v_payment_method, v_user_id, v_group_id, 'completed'
    );
    
    -- Apply credit delta (add)
    PERFORM rpc_apply_credit_delta(v_client_id, v_total_credit_delta, 'Credit topup', v_order_id);
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'total_amount', v_total_amount,
    'credit_delta', v_total_credit_delta,
    'idempotent', false
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$function$;

-- =============================================
-- RPC: REFUND SALE
-- =============================================

CREATE OR REPLACE FUNCTION public.rpc_refund_sale(p_order_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_order record;
  v_item record;
BEGIN
  -- Get order
  SELECT * INTO v_order 
  FROM sales_orders 
  WHERE id = p_order_id AND user_id = p_user_id;
  
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  IF v_order.payment_status = 'refunded' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order already refunded'
    );
  END IF;
  
  -- Update order status
  UPDATE sales_orders 
  SET payment_status = 'refunded', updated_at = now()
  WHERE id = p_order_id;
  
  -- Restore stock for inventory items
  FOR v_item IN 
    SELECT * FROM sales_order_items WHERE order_id = p_order_id
  LOOP
    IF v_item.product_kind = 'inventory' THEN
      UPDATE products 
      SET stock_quantity = stock_quantity + v_item.quantity,
          updated_at = now()
      WHERE id = v_item.product_id;
    END IF;
  END LOOP;
  
  -- Reverse credit if payment was by credit
  IF v_order.payment_method = 'credit' AND v_order.client_id IS NOT NULL THEN
    -- Mark original transactions as reversed
    UPDATE credit_transactions 
    SET status = 'reversed'
    WHERE sale_order_id = p_order_id AND type = 'product';
    
    -- Create reversal transaction
    INSERT INTO credit_transactions (
      client_id, amount, type, description, sale_order_id,
      payment_method, user_id, group_id, status
    ) VALUES (
      v_order.client_id, v_order.total_amount, 'manual', 'Storno prodeje',
      p_order_id, 'credit', p_user_id, v_order.group_id, 'completed'
    );
    
    -- Apply credit delta (refund)
    PERFORM rpc_apply_credit_delta(v_order.client_id, v_order.total_amount, 'Sale refund', p_order_id);
  END IF;
  
  -- Reverse credit topups
  FOR v_item IN 
    SELECT * FROM sales_order_items 
    WHERE order_id = p_order_id AND credit_delta > 0
  LOOP
    IF v_order.client_id IS NOT NULL THEN
      -- Create reversal for topup
      INSERT INTO credit_transactions (
        client_id, amount, type, description, sale_order_id,
        payment_method, user_id, group_id, status
      ) VALUES (
        v_order.client_id, -(v_item.credit_delta * v_item.quantity), 'manual', 
        'Storno dobití kreditu', p_order_id, v_order.payment_method, 
        p_user_id, v_order.group_id, 'completed'
      );
      
      -- Reverse credit
      PERFORM rpc_apply_credit_delta(
        v_order.client_id, 
        -(v_item.credit_delta * v_item.quantity), 
        'Credit topup refund', 
        p_order_id
      );
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'refunded_amount', v_order.total_amount
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$function$;

-- =============================================
-- RPC: GET SYSTEM CLIENT
-- =============================================

CREATE OR REPLACE FUNCTION public.rpc_get_or_create_system_client(
  p_user_id uuid,
  p_system_key text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_client_id uuid;
BEGIN
  -- Try to find existing system client for this user
  SELECT id INTO v_client_id
  FROM clients
  WHERE user_id = p_user_id 
    AND system_key = p_system_key
    AND is_system = true;
  
  IF v_client_id IS NULL THEN
    -- Create system client
    INSERT INTO clients (
      user_id, name, is_system, system_key, credit_balance
    ) VALUES (
      p_user_id,
      CASE p_system_key 
        WHEN 'anonymous_customer' THEN 'Anonymní zákazník'
        ELSE p_system_key
      END,
      true,
      p_system_key,
      0
    )
    RETURNING id INTO v_client_id;
  END IF;
  
  RETURN v_client_id;
END;
$function$;