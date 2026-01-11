-- Fix products table RLS policies - change from public to authenticated

DROP POLICY IF EXISTS "Users can create their own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;
DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;

CREATE POLICY "Users can create their own products" ON public.products
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products" ON public.products
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" ON public.products
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own products" ON public.products
FOR SELECT TO authenticated
USING (auth.uid() = user_id);