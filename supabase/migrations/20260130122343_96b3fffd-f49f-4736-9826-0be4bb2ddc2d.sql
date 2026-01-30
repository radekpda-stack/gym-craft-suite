-- Add nutrition columns to nutrition_food_entries for AI enrichment
ALTER TABLE public.nutrition_food_entries
ADD COLUMN IF NOT EXISTS calories integer,
ADD COLUMN IF NOT EXISTS protein_g numeric(5,1),
ADD COLUMN IF NOT EXISTS carbs_g numeric(5,1),
ADD COLUMN IF NOT EXISTS fat_g numeric(5,1),
ADD COLUMN IF NOT EXISTS fiber_g numeric(5,1),
ADD COLUMN IF NOT EXISTS ai_enriched boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_enriched_at timestamptz;

-- Create index for efficient querying of AI-enriched entries
CREATE INDEX IF NOT EXISTS idx_nutrition_food_entries_ai_enriched 
ON public.nutrition_food_entries (client_id, ai_enriched) 
WHERE ai_enriched = true;

-- Add comment for documentation
COMMENT ON COLUMN public.nutrition_food_entries.calories IS 'AI-estimated calories for this specific entry';
COMMENT ON COLUMN public.nutrition_food_entries.protein_g IS 'AI-estimated protein in grams';
COMMENT ON COLUMN public.nutrition_food_entries.carbs_g IS 'AI-estimated carbohydrates in grams';
COMMENT ON COLUMN public.nutrition_food_entries.fat_g IS 'AI-estimated fat in grams';
COMMENT ON COLUMN public.nutrition_food_entries.fiber_g IS 'AI-estimated fiber in grams';
COMMENT ON COLUMN public.nutrition_food_entries.ai_enriched IS 'Whether this entry has been enriched by AI';
COMMENT ON COLUMN public.nutrition_food_entries.ai_enriched_at IS 'When the AI enrichment was performed';