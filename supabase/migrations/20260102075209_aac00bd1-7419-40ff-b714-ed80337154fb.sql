-- Fix function search path security warnings
CREATE OR REPLACE FUNCTION public.calculate_xp_level(p_total_xp integer)
RETURNS TABLE(level integer, level_xp integer, xp_to_next integer) 
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_level integer := 1;
  v_xp_for_level integer := 100;
  v_remaining_xp integer := p_total_xp;
BEGIN
  WHILE v_remaining_xp >= v_xp_for_level LOOP
    v_remaining_xp := v_remaining_xp - v_xp_for_level;
    v_level := v_level + 1;
    v_xp_for_level := 100 + (v_level - 1) * 50;
  END LOOP;
  RETURN QUERY SELECT v_level, v_remaining_xp, v_xp_for_level;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_client_xp(p_client_id uuid)
RETURNS void 
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_xp integer;
  v_level_data record;
BEGIN
  SELECT COALESCE(SUM(xp_amount), 0) INTO v_total_xp FROM xp_events WHERE client_id = p_client_id;
  SELECT * INTO v_level_data FROM calculate_xp_level(v_total_xp);
  INSERT INTO client_xp (client_id, total_xp, level, level_xp, xp_to_next, updated_at)
  VALUES (p_client_id, v_total_xp, v_level_data.level, v_level_data.level_xp, v_level_data.xp_to_next, now())
  ON CONFLICT (client_id) DO UPDATE SET
    total_xp = v_total_xp,
    level = v_level_data.level,
    level_xp = v_level_data.level_xp,
    xp_to_next = v_level_data.xp_to_next,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_loyalty_balance(p_client_id uuid)
RETURNS void 
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
  v_lifetime integer;
BEGIN
  SELECT COALESCE(SUM(points), 0), COALESCE(SUM(CASE WHEN points > 0 THEN points ELSE 0 END), 0)
  INTO v_balance, v_lifetime FROM loyalty_ledger WHERE client_id = p_client_id;
  INSERT INTO loyalty_balance (client_id, points_balance, lifetime_points, updated_at)
  VALUES (p_client_id, v_balance, v_lifetime, now())
  ON CONFLICT (client_id) DO UPDATE SET points_balance = v_balance, lifetime_points = v_lifetime, updated_at = now();
END;
$$;

-- Add shop and XP milestone badges
INSERT INTO badge_definitions (id, name, description, rarity, icon_key, rule_type, rule_value, is_active, xp_bonus, display_order)
VALUES 
  ('hydration-hero', 'Hydration Hero', '10× nákup kategorie voda', 'Rare', 'droplet', 'shop_category', '{"category": "voda", "count": 10}', true, 25, 100),
  ('snack-stack', 'Snack Stack', '10× nákup kategorie tyčinka', 'Rare', 'cookie', 'shop_category', '{"category": "tyčinka", "count": 10}', true, 25, 101),
  ('protein-regular', 'Protein Regular', '5× nákup kategorie protein', 'Rare', 'milk', 'shop_category', '{"category": "protein", "count": 5}', true, 50, 102),
  ('supporter', 'Supporter', '300+ lifetime LP', 'Epic', 'heart-handshake', 'lp_milestone', '{"lifetime_points": 300}', true, 100, 103),
  ('xp-500', 'Začátečník', 'Získej 500 XP', 'Common', 'star', 'xp_milestone', '{"xp": 500}', true, 25, 110),
  ('xp-2000', 'Pokročilý', 'Získej 2000 XP', 'Rare', 'star', 'xp_milestone', '{"xp": 2000}', true, 50, 111),
  ('xp-5000', 'Expert', 'Získej 5000 XP', 'Epic', 'star', 'xp_milestone', '{"xp": 5000}', true, 100, 112),
  ('xp-10000', 'Legenda', 'Získej 10000 XP', 'Legendary', 'crown', 'xp_milestone', '{"xp": 10000}', true, 150, 113)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  rule_value = EXCLUDED.rule_value,
  xp_bonus = EXCLUDED.xp_bonus;