-- Add payment_method to sales_order_items to allow per-item payment method
ALTER TABLE public.sales_order_items 
ADD COLUMN payment_method text DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.sales_order_items.payment_method IS 'Optional per-item payment method. If NULL, uses the order-level payment_method.';