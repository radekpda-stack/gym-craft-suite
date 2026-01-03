-- Insert new badge definitions for extended gamification

-- Early Bird badges (morning workouts before 9:00)
INSERT INTO badge_definitions (id, name, description, icon_key, rarity, rule_type, rule_value, xp_bonus, display_order, is_active)
VALUES 
  ('early_bird_10', 'Ranní ptáče', '10 tréninků před 9:00', 'early_bird', 'Common', 'special', '{"special_type": "early_bird", "before_hour": 9, "count": 10}', 25, 100, true),
  ('early_bird_25', 'Ranní profesionál', '25 tréninků před 9:00', 'early_bird', 'Uncommon', 'special', '{"special_type": "early_bird", "before_hour": 9, "count": 25}', 50, 101, true),
  ('early_bird_50', 'Ranní legenda', '50 tréninků před 9:00', 'early_bird', 'Rare', 'special', '{"special_type": "early_bird", "before_hour": 9, "count": 50}', 75, 102, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  rule_value = EXCLUDED.rule_value,
  xp_bonus = EXCLUDED.xp_bonus;

-- Weekend Warrior badges
INSERT INTO badge_definitions (id, name, description, icon_key, rarity, rule_type, rule_value, xp_bonus, display_order, is_active)
VALUES 
  ('weekend_warrior_10', 'Víkendový bojovník', '10 víkendových tréninků', 'weekend', 'Common', 'special', '{"special_type": "weekend", "count": 10}', 25, 110, true),
  ('weekend_warrior_25', 'Víkendový válečník', '25 víkendových tréninků', 'weekend', 'Uncommon', 'special', '{"special_type": "weekend", "count": 25}', 50, 111, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  rule_value = EXCLUDED.rule_value,
  xp_bonus = EXCLUDED.xp_bonus;

-- First of Week badges
INSERT INTO badge_definitions (id, name, description, icon_key, rarity, rule_type, rule_value, xp_bonus, display_order, is_active)
VALUES 
  ('first_of_week_10', 'Průkopník', '10× první trénink v týdnu', 'first_week', 'Common', 'special', '{"special_type": "first_of_week", "count": 10}', 25, 120, true),
  ('first_of_week_50', 'Týdenní iniciátor', '50× první trénink v týdnu', 'first_week', 'Rare', 'special', '{"special_type": "first_of_week", "count": 50}', 75, 121, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  rule_value = EXCLUDED.rule_value,
  xp_bonus = EXCLUDED.xp_bonus;

-- Special achievement badges
INSERT INTO badge_definitions (id, name, description, icon_key, rarity, rule_type, rule_value, xp_bonus, display_order, is_active)
VALUES 
  ('variety_master', 'Triatlonista', '3 různé typy tréninku v jednom týdnu', 'variety', 'Uncommon', 'special', '{"special_type": "variety_week", "count": 1}', 35, 130, true),
  ('double_day', 'Dvoják', '2 tréninky ve stejný den', 'double', 'Uncommon', 'special', '{"special_type": "double_day", "count": 1}', 25, 131, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  rule_value = EXCLUDED.rule_value,
  xp_bonus = EXCLUDED.xp_bonus;

-- XP Milestone badges
INSERT INTO badge_definitions (id, name, description, icon_key, rarity, rule_type, rule_value, xp_bonus, display_order, is_active)
VALUES 
  ('xp_1000', 'Nováček', 'Získej 1000 XP', 'xp_milestone', 'Common', 'xp_milestone', '{"xp": 1000}', 25, 200, true),
  ('xp_2500', 'Zkušený', 'Získej 2500 XP', 'xp_milestone', 'Uncommon', 'xp_milestone', '{"xp": 2500}', 50, 201, true),
  ('xp_10000', 'Veterán', 'Získej 10000 XP', 'xp_milestone', 'Legendary', 'xp_milestone', '{"xp": 10000}', 150, 202, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  rule_value = EXCLUDED.rule_value,
  xp_bonus = EXCLUDED.xp_bonus;