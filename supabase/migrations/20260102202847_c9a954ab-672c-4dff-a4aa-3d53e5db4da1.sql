-- Function to calculate XP from product profit margin
-- XP = profit (price - purchase_price) for each item sold
CREATE OR REPLACE FUNCTION calculate_sale_xp(p_items jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_xp integer := 0;
  v_item jsonb;
  v_product record;
  v_quantity integer;
  v_profit numeric;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product
    FROM products
    WHERE id = (v_item->>'product_id')::uuid;
    
    IF v_product IS NOT NULL AND v_product.kind = 'inventory' THEN
      v_quantity := COALESCE((v_item->>'quantity')::integer, 1);
      -- Calculate profit per item (price - purchase_price)
      v_profit := COALESCE(v_product.price - COALESCE(v_product.purchase_price, 0), 0);
      -- XP = profit * quantity (minimum 0, rounded to integer)
      IF v_profit > 0 THEN
        v_total_xp := v_total_xp + ROUND(v_profit * v_quantity)::integer;
      END IF;
    END IF;
  END LOOP;
  
  RETURN v_total_xp;
END;
$$;

-- Function to add XP to client
CREATE OR REPLACE FUNCTION add_client_xp(p_client_id uuid, p_xp_amount integer, p_source text DEFAULT 'sale')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_xp record;
  v_new_total_xp integer;
  v_new_level integer;
  v_new_level_xp integer;
  v_xp_to_next integer;
BEGIN
  IF p_xp_amount <= 0 OR p_client_id IS NULL THEN
    RETURN;
  END IF;

  -- Get or create client_xp record
  SELECT * INTO v_current_xp FROM client_xp WHERE client_id = p_client_id;
  
  IF v_current_xp IS NULL THEN
    -- Initialize with base values
    INSERT INTO client_xp (client_id, total_xp, level, level_xp, xp_to_next, last_xp_date)
    VALUES (p_client_id, p_xp_amount, 1, p_xp_amount, 100 - p_xp_amount, now());
    RETURN;
  END IF;
  
  -- Calculate new values
  v_new_total_xp := v_current_xp.total_xp + p_xp_amount;
  v_new_level_xp := v_current_xp.level_xp + p_xp_amount;
  v_new_level := v_current_xp.level;
  
  -- Level up logic (100 XP per level, scaling by 1.2x each level)
  WHILE v_new_level_xp >= v_current_xp.xp_to_next LOOP
    v_new_level_xp := v_new_level_xp - v_current_xp.xp_to_next;
    v_new_level := v_new_level + 1;
  END LOOP;
  
  -- Calculate XP needed for next level (base 100, scaling 1.2x per level)
  v_xp_to_next := ROUND(100 * POWER(1.2, v_new_level - 1))::integer - v_new_level_xp;
  
  -- Update client_xp
  UPDATE client_xp
  SET 
    total_xp = v_new_total_xp,
    level = v_new_level,
    level_xp = v_new_level_xp,
    xp_to_next = v_xp_to_next,
    last_xp_date = now(),
    updated_at = now()
  WHERE client_id = p_client_id;
END;
$$;

-- Add xp_earned column to sales_orders for tracking
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS xp_earned integer DEFAULT 0;