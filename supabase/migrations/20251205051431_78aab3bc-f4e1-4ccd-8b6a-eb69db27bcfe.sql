-- Update RLS policy for products to allow viewing shared products (user_id is null) or own products
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;

CREATE POLICY "Users can view own and shared products" 
ON public.products 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);