
CREATE OR REPLACE FUNCTION public.rpc_increment_stock(
  p_product_id UUID, 
  p_delta INT
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE products 
  SET stock_quantity = COALESCE(stock_quantity, 0) + p_delta 
  WHERE id = p_product_id;
END;
$$;
