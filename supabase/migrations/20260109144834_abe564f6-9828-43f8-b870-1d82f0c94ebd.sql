-- Update the check_and_disable_legacy_pricing function to also disable
-- legacy pricing when remaining credit is less than minimum training price

CREATE OR REPLACE FUNCTION public.check_and_disable_legacy_pricing()
RETURNS TRIGGER AS $$
DECLARE
  v_grandfathered_credit NUMERIC;
  v_grandfathered_at TIMESTAMPTZ;
  v_use_legacy_pricing BOOLEAN;
  v_total_consumed NUMERIC;
  v_remaining_grandfathered NUMERIC;
  v_min_training_price NUMERIC := 800; -- Minimum training price (1 participant)
BEGIN
  -- Get client settings
  SELECT grandfathered_credit, grandfathered_at, use_legacy_pricing
  INTO v_grandfathered_credit, v_grandfathered_at, v_use_legacy_pricing
  FROM clients WHERE id = NEW.client_id;
  
  -- If legacy pricing is not active, do nothing
  IF NOT v_use_legacy_pricing OR v_grandfathered_credit IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Calculate total consumption since activation
  SELECT COALESCE(SUM(amount_czk), 0) INTO v_total_consumed
  FROM credit_consumptions
  WHERE client_id = NEW.client_id
    AND created_at >= v_grandfathered_at;
  
  -- Remaining credit under fix
  v_remaining_grandfathered := v_grandfathered_credit - v_total_consumed;
  
  -- Disable legacy pricing if:
  -- 1. Fully consumed (consumption >= fixed amount)
  -- 2. Remaining is less than minimum training price
  IF v_total_consumed >= v_grandfathered_credit 
     OR v_remaining_grandfathered < v_min_training_price THEN
    UPDATE clients 
    SET use_legacy_pricing = false
    WHERE id = NEW.client_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;