-- Add xp_bonus column to products for manual XP assignment
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS xp_bonus integer DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.products.xp_bonus IS 'Bonus XP awarded when this product is purchased';