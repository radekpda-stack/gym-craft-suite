-- First, drop the old check constraint and add new one with purchase_count
ALTER TABLE public.badge_definitions DROP CONSTRAINT badge_definitions_rule_type_check;

ALTER TABLE public.badge_definitions ADD CONSTRAINT badge_definitions_rule_type_check 
CHECK (rule_type = ANY (ARRAY['milestone_total'::text, 'streak_weeks'::text, 'type_count'::text, 'special'::text, 'seasonal'::text, 'holiday'::text, 'shop_category'::text, 'lp_milestone'::text, 'challenge'::text, 'xp_milestone'::text, 'purchase_count'::text]));

-- Now update badge definitions with correct rule_type for purchase badges
UPDATE public.badge_definitions SET 
  rule_type = 'purchase_count',
  rule_value = '{"count": 1}'::jsonb
WHERE id = 'purchase_first';

UPDATE public.badge_definitions SET 
  rule_type = 'purchase_count',
  rule_value = '{"count": 5}'::jsonb
WHERE id = 'purchase_5';

UPDATE public.badge_definitions SET 
  rule_type = 'purchase_count',
  rule_value = '{"count": 10}'::jsonb
WHERE id = 'purchase_10';

UPDATE public.badge_definitions SET 
  rule_type = 'purchase_count',
  rule_value = '{"count": 25}'::jsonb
WHERE id = 'purchase_25';

-- Hydration badge - water category (will combine with drink in code)
UPDATE public.badge_definitions SET 
  rule_type = 'shop_category',
  rule_value = '{"category": "water", "count": 10}'::jsonb
WHERE id = 'hydration_master';

-- Supplement badge
UPDATE public.badge_definitions SET 
  rule_type = 'shop_category',
  rule_value = '{"category": "supplement", "count": 5}'::jsonb
WHERE id = 'supplement_fan';