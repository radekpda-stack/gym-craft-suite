
-- Add RLS policy for clients to view their own purchases
-- Clients are authenticated via client_accounts.auth_user_id

-- Policy for sales_orders - allow clients to view their own orders
CREATE POLICY "Clients can view their own sales orders"
ON public.sales_orders
FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM client_accounts 
    WHERE auth_user_id = auth.uid()
  )
);

-- Policy for sales_order_items - allow clients to view items of their orders
CREATE POLICY "Clients can view their own order items"
ON public.sales_order_items
FOR SELECT
USING (
  order_id IN (
    SELECT so.id FROM sales_orders so
    JOIN client_accounts ca ON ca.client_id = so.client_id
    WHERE ca.auth_user_id = auth.uid()
  )
);
