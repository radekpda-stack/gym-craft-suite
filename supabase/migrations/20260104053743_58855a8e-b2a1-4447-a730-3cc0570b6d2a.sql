-- Drop the rule_type check constraint to allow new nutrition rule types
ALTER TABLE public.badge_definitions DROP CONSTRAINT IF EXISTS badge_definitions_rule_type_check;

-- Create table for tracking nutrition XP claims to prevent duplicates
CREATE TABLE IF NOT EXISTS public.nutrition_xp_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  claim_date DATE NOT NULL,
  claim_type TEXT NOT NULL,
  xp_amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, claim_date, claim_type)
);

-- Enable RLS
ALTER TABLE public.nutrition_xp_claims ENABLE ROW LEVEL SECURITY;

-- Create policies for nutrition_xp_claims
CREATE POLICY "Trainers can view their clients claims" ON public.nutrition_xp_claims
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.clients c 
    WHERE c.id = nutrition_xp_claims.client_id 
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Service role full access" ON public.nutrition_xp_claims
FOR ALL USING (auth.role() = 'service_role');

-- Insert badge definitions for nutrition
INSERT INTO public.badge_definitions (id, name, description, rule_type, rule_value, rarity, xp_bonus, icon_key, is_active, display_order)
VALUES 
  ('nutrition_first', 'První záznam', 'Zapiš první jídlo do nutričního deníku', 'nutrition_entries_count', '{"count": 1}'::jsonb, 'Common', 10, 'apple', true, 200),
  ('nutrition_10', 'Nutriční nováček', 'Zaznamenej 10 jídel', 'nutrition_entries_count', '{"count": 10}'::jsonb, 'Common', 25, 'utensils', true, 201),
  ('nutrition_50', 'Nutriční nadšenec', 'Zaznamenej 50 jídel', 'nutrition_entries_count', '{"count": 50}'::jsonb, 'Uncommon', 50, 'salad', true, 202),
  ('nutrition_100', 'Nutriční centurion', 'Zaznamenej 100 jídel', 'nutrition_entries_count', '{"count": 100}'::jsonb, 'Rare', 75, 'trophy', true, 203),
  ('nutrition_day_complete_1', 'Kompletní den', 'Zapiš alespoň 3 jídla a vodu v jednom dni', 'nutrition_days_complete', '{"count": 1}'::jsonb, 'Common', 15, 'calendar-check', true, 210),
  ('nutrition_day_complete_7', 'Týden disciplíny', '7 kompletních nutričních dnů', 'nutrition_days_complete', '{"count": 7}'::jsonb, 'Uncommon', 40, 'calendar-range', true, 211),
  ('nutrition_day_complete_30', 'Měsíc disciplíny', '30 kompletních nutričních dnů', 'nutrition_days_complete', '{"count": 30}'::jsonb, 'Rare', 80, 'calendar-heart', true, 212),
  ('nutrition_streak_3', '3 dny v řadě', 'Zapisuj jídlo 3 dny po sobě', 'nutrition_streak_days', '{"days": 3}'::jsonb, 'Common', 20, 'flame', true, 220),
  ('nutrition_streak_7', 'Týdenní streak', 'Zapisuj jídlo 7 dní po sobě', 'nutrition_streak_days', '{"days": 7}'::jsonb, 'Uncommon', 50, 'fire', true, 221),
  ('nutrition_streak_14', 'Čtrnáctidenní série', 'Zapisuj jídlo 14 dní po sobě', 'nutrition_streak_days', '{"days": 14}'::jsonb, 'Rare', 75, 'fire-extinguisher', true, 222),
  ('hydration_hero', 'Hydratační hrdina', 'Vypij alespoň 2 litry vody za den (7× dosaženo)', 'nutrition_special', '{"special_type": "hydration_2l", "count": 7}'::jsonb, 'Uncommon', 40, 'droplets', true, 230),
  ('breakfast_champion', 'Snídaňový šampion', 'Zaznamenej snídani 14× za 2 týdny', 'nutrition_special', '{"special_type": "breakfast_count", "count": 14}'::jsonb, 'Uncommon', 35, 'sunrise', true, 231)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  rule_type = EXCLUDED.rule_type,
  rule_value = EXCLUDED.rule_value,
  rarity = EXCLUDED.rarity,
  xp_bonus = EXCLUDED.xp_bonus,
  icon_key = EXCLUDED.icon_key,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order;