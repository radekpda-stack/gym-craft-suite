-- 1. Create body_part_categories table (high-level: upper, lower, core)
CREATE TABLE public.body_part_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name_cs text NOT NULL,
  name_en text NOT NULL,
  display_order int NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.body_part_categories ENABLE ROW LEVEL SECURITY;

-- Public read access (reference data)
CREATE POLICY "Body part categories are publicly readable"
ON public.body_part_categories FOR SELECT
USING (true);

-- 2. Seed high-level categories
INSERT INTO public.body_part_categories (key, name_cs, name_en, display_order) VALUES
  ('upper', 'Horní část', 'Upper Body', 1),
  ('lower', 'Dolní část', 'Lower Body', 2),
  ('core', 'Core', 'Core', 3);

-- 3. Create mapping table: muscle_group -> body_part_category
CREATE TABLE public.muscle_group_to_body_part (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  muscle_group_id uuid NOT NULL REFERENCES public.muscle_groups(id) ON DELETE CASCADE,
  body_part_category_id uuid NOT NULL REFERENCES public.body_part_categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(muscle_group_id)
);

-- Enable RLS
ALTER TABLE public.muscle_group_to_body_part ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Muscle group to body part mapping is publicly readable"
ON public.muscle_group_to_body_part FOR SELECT
USING (true);

-- 4. Populate mapping based on muscle_groups.region
-- dolni_koncetiny -> lower
-- horni_koncetiny -> upper
-- trup -> core
INSERT INTO public.muscle_group_to_body_part (muscle_group_id, body_part_category_id)
SELECT 
  mg.id,
  CASE mg.region
    WHEN 'dolni_koncetiny' THEN (SELECT id FROM public.body_part_categories WHERE key = 'lower')
    WHEN 'horni_koncetiny' THEN (SELECT id FROM public.body_part_categories WHERE key = 'upper')
    WHEN 'trup' THEN (SELECT id FROM public.body_part_categories WHERE key = 'core')
    ELSE (SELECT id FROM public.body_part_categories WHERE key = 'core') -- fallback
  END
FROM public.muscle_groups mg;

-- 5. Create view for exercise -> body_part_categories (derived)
CREATE OR REPLACE VIEW public.exercise_body_part_categories AS
SELECT DISTINCT
  emg.exercise_id,
  bpc.id as body_part_category_id,
  bpc.key as body_part_key,
  bpc.name_cs as body_part_name_cs,
  bpc.name_en as body_part_name_en,
  bpc.display_order
FROM public.exercise_muscle_groups emg
JOIN public.muscle_group_to_body_part mgbp ON mgbp.muscle_group_id = emg.muscle_group_id
JOIN public.body_part_categories bpc ON bpc.id = mgbp.body_part_category_id
ORDER BY emg.exercise_id, bpc.display_order;

-- 6. Fix typo: "Hyzdě" -> "Hýždě"
UPDATE public.tags 
SET name = 'Hýždě'
WHERE name = 'Hyzdě' AND tag_type = 'body_part';