-- Add description column to price_lists
ALTER TABLE price_lists ADD COLUMN IF NOT EXISTS description TEXT;

-- Create or replace function to get current active price list based on date
CREATE OR REPLACE FUNCTION rpc_get_current_price_list()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price_list_id UUID;
BEGIN
  -- Get the most recent price list that is active and has effective_from <= now
  SELECT id INTO v_price_list_id
  FROM price_lists
  WHERE is_active = true
    AND effective_from <= CURRENT_DATE
  ORDER BY effective_from DESC
  LIMIT 1;
  
  RETURN v_price_list_id;
END;
$$;

-- Create function to get upcoming price list (future)
CREATE OR REPLACE FUNCTION rpc_get_upcoming_price_list()
RETURNS TABLE (
  id UUID,
  name TEXT,
  effective_from DATE,
  description TEXT,
  days_until INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pl.id,
    pl.name,
    pl.effective_from::DATE,
    pl.description,
    (pl.effective_from::DATE - CURRENT_DATE)::INTEGER as days_until
  FROM price_lists pl
  WHERE pl.is_active = true
    AND pl.effective_from > CURRENT_DATE
  ORDER BY pl.effective_from ASC
  LIMIT 1;
END;
$$;