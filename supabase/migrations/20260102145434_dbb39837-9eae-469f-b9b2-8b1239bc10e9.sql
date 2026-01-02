-- Add badges for product purchases at the gym
INSERT INTO public.badge_definitions (id, name, description, rarity, icon_key, style, rule_type, rule_value, is_active, display_order, xp_bonus)
VALUES 
  ('purchase_first', 'První nákup', 'Zakoupil/a jsi první produkt ve fitku', 'Common', 'shopping_bag', 'minimal', 'special', '{"type": "purchase_count", "count": 1}'::jsonb, true, 50, 10),
  ('purchase_5', 'Stálý zákazník', '5 nákupů produktů ve fitku', 'Uncommon', 'shopping_bag', 'minimal', 'special', '{"type": "purchase_count", "count": 5}'::jsonb, true, 51, 25),
  ('purchase_10', 'VIP zákazník', '10 nákupů produktů ve fitku', 'Rare', 'shopping_bag', 'minimal', 'special', '{"type": "purchase_count", "count": 10}'::jsonb, true, 52, 50),
  ('purchase_25', 'Podporovatel fitka', '25 nákupů produktů ve fitku', 'Epic', 'star', 'minimal', 'special', '{"type": "purchase_count", "count": 25}'::jsonb, true, 53, 100),
  ('hydration_master', 'Mistr hydratace', 'Koupil/a jsi 10× nápoj při tréninku', 'Uncommon', 'droplets', 'minimal', 'special', '{"type": "drink_purchase", "count": 10}'::jsonb, true, 54, 25),
  ('supplement_fan', 'Suplement fanoušek', 'Zakoupil/a jsi 5× suplementy', 'Rare', 'pill', 'minimal', 'special', '{"type": "supplement_purchase", "count": 5}'::jsonb, true, 55, 50)
ON CONFLICT (id) DO NOTHING;