-- Drop the existing permissive SELECT policy that includes shared products
DROP POLICY IF EXISTS "Users can view own and shared products" ON public.products;

-- Create new strict policy: users can only see their own products
CREATE POLICY "Users can view their own products" 
ON public.products 
FOR SELECT 
USING (auth.uid() = user_id);

-- Verify update policy exists (should already be there)
DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
CREATE POLICY "Users can update their own products" 
ON public.products 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Verify delete policy exists (should already be there)
DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;
CREATE POLICY "Users can delete their own products" 
ON public.products 
FOR DELETE 
USING (auth.uid() = user_id);

-- Verify insert policy exists (should already be there)
DROP POLICY IF EXISTS "Users can create their own products" ON public.products;
CREATE POLICY "Users can create their own products" 
ON public.products 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);