-- Rozšíření nutrition_meal_templates o nutriční hodnoty z AI
ALTER TABLE public.nutrition_meal_templates
ADD COLUMN IF NOT EXISTS calories_per_portion integer,
ADD COLUMN IF NOT EXISTS protein_g numeric(5,1),
ADD COLUMN IF NOT EXISTS carbs_g numeric(5,1),
ADD COLUMN IF NOT EXISTS fat_g numeric(5,1),
ADD COLUMN IF NOT EXISTS fiber_g numeric(5,1),
ADD COLUMN IF NOT EXISTS ai_enriched boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_enriched_at timestamptz,
ADD COLUMN IF NOT EXISTS normalized_name text;

-- Rozšíření client_workout_logs o AI kalorie
ALTER TABLE public.client_workout_logs
ADD COLUMN IF NOT EXISTS calories_burned integer,
ADD COLUMN IF NOT EXISTS ai_enriched boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_enriched_at timestamptz;

-- Index pro rychlé vyhledávání normalizovaných názvů
CREATE INDEX IF NOT EXISTS idx_meal_templates_normalized 
ON public.nutrition_meal_templates (client_id, normalized_name);

-- Index pro AI obohacení
CREATE INDEX IF NOT EXISTS idx_meal_templates_ai_enriched 
ON public.nutrition_meal_templates (ai_enriched) WHERE ai_enriched = false;