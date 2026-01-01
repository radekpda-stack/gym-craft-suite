
-- Badge definitions table (predefined badges)
CREATE TABLE public.badge_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  rarity TEXT NOT NULL CHECK (rarity IN ('Common', 'Uncommon', 'Rare', 'Epic', 'Legendary')),
  icon_key TEXT NOT NULL,
  style TEXT DEFAULT 'minimal',
  rule_type TEXT NOT NULL CHECK (rule_type IN ('milestone_total', 'streak_weeks', 'type_count', 'special', 'seasonal', 'holiday')),
  rule_value JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  start_at TIMESTAMP WITH TIME ZONE,
  end_at TIMESTAMP WITH TIME ZONE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Client badges (progress + earned status)
CREATE TABLE public.client_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES public.badge_definitions(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE,
  progress_current INTEGER DEFAULT 0,
  progress_target INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(client_id, badge_id)
);

-- Client leaderboard settings
CREATE TABLE public.client_leaderboard_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE,
  leaderboard_visible BOOLEAN DEFAULT true,
  leaderboard_nickname TEXT DEFAULT 'Anonym',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Client confirmed workouts (self-reported by clients)
CREATE TABLE public.client_confirmed_workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  performed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  performed_date DATE NOT NULL,
  workout_type TEXT,
  confirmed_by TEXT NOT NULL DEFAULT 'client' CHECK (confirmed_by IN ('coach', 'client')),
  xp INTEGER NOT NULL DEFAULT 6,
  training_session_id UUID REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Anti-cheat: unique index for client-confirmed workouts per day
CREATE UNIQUE INDEX idx_unique_client_workout_per_day 
ON public.client_confirmed_workouts (client_id, performed_date)
WHERE confirmed_by = 'client';

-- Enable RLS
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_leaderboard_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_confirmed_workouts ENABLE ROW LEVEL SECURITY;

-- Badge definitions: public read
CREATE POLICY "Badge definitions are viewable by everyone" 
ON public.badge_definitions FOR SELECT USING (true);

-- Client badges: clients can see their own, trainers can see their clients
CREATE POLICY "Clients can view their own badges" 
ON public.client_badges FOR SELECT 
USING (
  client_id IN (
    SELECT ca.client_id FROM public.client_accounts ca 
    WHERE ca.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Trainers can view client badges" 
ON public.client_badges FOR SELECT 
USING (
  client_id IN (
    SELECT c.id FROM public.clients c WHERE c.user_id = auth.uid()
  )
);

CREATE POLICY "Trainers can manage client badges"
ON public.client_badges FOR ALL
USING (
  client_id IN (
    SELECT c.id FROM public.clients c WHERE c.user_id = auth.uid()
  )
);

-- Leaderboard settings: public read for visible ones
CREATE POLICY "Anyone can view visible leaderboard settings"
ON public.client_leaderboard_settings FOR SELECT
USING (leaderboard_visible = true);

CREATE POLICY "Clients can view their own leaderboard settings"
ON public.client_leaderboard_settings FOR SELECT
USING (
  client_id IN (
    SELECT ca.client_id FROM public.client_accounts ca 
    WHERE ca.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Clients can update their own leaderboard settings"
ON public.client_leaderboard_settings FOR UPDATE
USING (
  client_id IN (
    SELECT ca.client_id FROM public.client_accounts ca 
    WHERE ca.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Clients can insert their own leaderboard settings"
ON public.client_leaderboard_settings FOR INSERT
WITH CHECK (
  client_id IN (
    SELECT ca.client_id FROM public.client_accounts ca 
    WHERE ca.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Trainers can manage leaderboard settings"
ON public.client_leaderboard_settings FOR ALL
USING (
  client_id IN (
    SELECT c.id FROM public.clients c WHERE c.user_id = auth.uid()
  )
);

-- Confirmed workouts
CREATE POLICY "Clients can view their own confirmed workouts"
ON public.client_confirmed_workouts FOR SELECT
USING (
  client_id IN (
    SELECT ca.client_id FROM public.client_accounts ca 
    WHERE ca.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Clients can insert their own confirmed workouts"
ON public.client_confirmed_workouts FOR INSERT
WITH CHECK (
  client_id IN (
    SELECT ca.client_id FROM public.client_accounts ca 
    WHERE ca.auth_user_id = auth.uid()
  )
  AND confirmed_by = 'client'
);

CREATE POLICY "Trainers can manage client confirmed workouts"
ON public.client_confirmed_workouts FOR ALL
USING (
  client_id IN (
    SELECT c.id FROM public.clients c WHERE c.user_id = auth.uid()
  )
);

-- Create indexes
CREATE INDEX idx_client_badges_client_id ON public.client_badges(client_id);
CREATE INDEX idx_client_badges_badge_id ON public.client_badges(badge_id);
CREATE INDEX idx_client_badges_earned_at ON public.client_badges(earned_at) WHERE earned_at IS NOT NULL;
CREATE INDEX idx_client_confirmed_workouts_client_id ON public.client_confirmed_workouts(client_id);
CREATE INDEX idx_client_confirmed_workouts_performed_at ON public.client_confirmed_workouts(performed_at);
CREATE INDEX idx_badge_definitions_rule_type ON public.badge_definitions(rule_type);

-- Trigger for updated_at
CREATE TRIGGER update_client_badges_updated_at
BEFORE UPDATE ON public.client_badges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_leaderboard_settings_updated_at
BEFORE UPDATE ON public.client_leaderboard_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert all badge definitions
-- A) Milestone badges (milestone_total)
INSERT INTO public.badge_definitions (id, name, description, rarity, icon_key, rule_type, rule_value, display_order) VALUES
('milestone_1', 'Start', 'První dokončený trénink', 'Common', 'dot', 'milestone_total', '{"count": 1}', 1),
('milestone_5', 'Rozjezd', '5 dokončených tréninků', 'Common', 'bars_1', 'milestone_total', '{"count": 5}', 2),
('milestone_10', 'Desítka', '10 dokončených tréninků', 'Common', 'bars_2', 'milestone_total', '{"count": 10}', 3),
('milestone_25', 'Čtvrtsto', '25 dokončených tréninků', 'Uncommon', 'badge_25', 'milestone_total', '{"count": 25}', 4),
('milestone_50', 'Padesátka', '50 dokončených tréninků', 'Uncommon', 'badge_50', 'milestone_total', '{"count": 50}', 5),
('milestone_75', '75 Club', '75 dokončených tréninků', 'Rare', 'badge_75', 'milestone_total', '{"count": 75}', 6),
('milestone_100', 'Stovka', '100 dokončených tréninků', 'Rare', 'badge_100', 'milestone_total', '{"count": 100}', 7),
('milestone_150', '150', '150 dokončených tréninků', 'Epic', 'badge_150', 'milestone_total', '{"count": 150}', 8),
('milestone_200', '200', '200 dokončených tréninků', 'Epic', 'badge_200', 'milestone_total', '{"count": 200}', 9),
('milestone_300', 'Legenda', '300 dokončených tréninků', 'Legendary', 'crown', 'milestone_total', '{"count": 300}', 10);

-- B) Streak badges (streak_weeks)
INSERT INTO public.badge_definitions (id, name, description, rarity, icon_key, rule_type, rule_value, display_order) VALUES
('streak_2', '2 týdny v řadě', 'Trénuj alespoň 1× týdně po dobu 2 týdnů', 'Common', 'link_2', 'streak_weeks', '{"weeks": 2}', 20),
('streak_4', 'Měsíc konzistence', 'Trénuj alespoň 1× týdně po dobu 4 týdnů', 'Uncommon', 'link_4', 'streak_weeks', '{"weeks": 4}', 21),
('streak_8', 'Železná vůle', 'Trénuj alespoň 1× týdně po dobu 8 týdnů', 'Rare', 'link_8', 'streak_weeks', '{"weeks": 8}', 22),
('streak_12', 'Čtvrtrok', 'Trénuj alespoň 1× týdně po dobu 12 týdnů', 'Rare', 'link_12', 'streak_weeks', '{"weeks": 12}', 23),
('streak_20', 'Nezastavitelný', 'Trénuj alespoň 1× týdně po dobu 20 týdnů', 'Epic', 'link_20', 'streak_weeks', '{"weeks": 20}', 24),
('streak_52', 'Rok v rytmu', 'Trénuj alespoň 1× týdně celý rok', 'Legendary', 'infinity', 'streak_weeks', '{"weeks": 52}', 25);

-- C) Type badges
INSERT INTO public.badge_definitions (id, name, description, rarity, icon_key, rule_type, rule_value, display_order) VALUES
('type_strength_20', 'Strength × 20', '20 silových tréninků', 'Uncommon', 'type_tag', 'type_count', '{"type": "strength", "count": 20}', 30);

-- D) Special badges
INSERT INTO public.badge_definitions (id, name, description, rarity, icon_key, rule_type, rule_value, display_order) VALUES
('special_early_bird', 'Ranní ptáče', '5 tréninků před 8:00', 'Rare', 'sunrise', 'special', '{"special_type": "early_bird", "count": 5, "before_hour": 8}', 40),
('special_no_excuses', 'No excuses', '5 tréninků v neděli', 'Rare', 'calendar_sun', 'special', '{"special_type": "sunday", "count": 5}', 41),
('special_comeback', 'Comeback', 'Trénink po pauze 14+ dní', 'Uncommon', 'comeback', 'special', '{"special_type": "comeback", "pause_days": 14}', 42),
('special_hattrick', 'Týdenní hattrick', '3 tréninky v jednom týdnu', 'Uncommon', 'triad', 'special', '{"special_type": "weekly_count", "count": 3}', 43),
('special_five_week', 'Pětka týdne', '5 tréninků v jednom týdnu', 'Epic', 'five', 'special', '{"special_type": "weekly_count", "count": 5}', 44);

-- E) Seasonal badges (dates for 2025/2026)
INSERT INTO public.badge_definitions (id, name, description, rarity, icon_key, rule_type, rule_value, start_at, end_at, display_order) VALUES
('seasonal_new_year_2026', 'Novoroční start', '5 tréninků mezi 1.1.–14.1.', 'Rare', 'spark', 'seasonal', '{"count": 5}', '2026-01-01 00:00:00+01', '2026-01-14 23:59:59+01', 50),
('seasonal_spring_2026', 'Jarní forma', '12 tréninků v březnu', 'Rare', 'leaf', 'seasonal', '{"count": 12}', '2026-03-01 00:00:00+01', '2026-03-31 23:59:59+02', 51),
('seasonal_summer_2026', 'Letní grind', '20 tréninků v červenci', 'Epic', 'sun', 'seasonal', '{"count": 20}', '2026-07-01 00:00:00+02', '2026-07-31 23:59:59+02', 52),
('seasonal_september_2026', 'Back to routine', '12 tréninků v září', 'Rare', 'reset', 'seasonal', '{"count": 12}', '2026-09-01 00:00:00+02', '2026-09-30 23:59:59+02', 53),
('seasonal_winter_2025', 'Zimní držák', '15 tréninků v prosinci', 'Epic', 'snow', 'seasonal', '{"count": 15}', '2025-12-01 00:00:00+01', '2025-12-31 23:59:59+01', 54);

-- F) Holiday badges (dates for 2025/2026)
INSERT INTO public.badge_definitions (id, name, description, rarity, icon_key, rule_type, rule_value, start_at, end_at, display_order) VALUES
('holiday_christmas_2025', 'Štědrý den', 'Trénink na Štědrý den', 'Epic', 'gift', 'holiday', '{"day": 24, "month": 12}', '2025-12-24 00:00:00+01', '2025-12-24 23:59:59+01', 60),
('holiday_new_year_eve_2025', 'Silvestr', 'Trénink na Silvestra', 'Epic', 'fireworks', 'holiday', '{"day": 31, "month": 12}', '2025-12-31 00:00:00+01', '2025-12-31 23:59:59+01', 61),
('holiday_new_year_2026', 'Nový rok', 'Trénink na Nový rok', 'Epic', 'champagne', 'holiday', '{"day": 1, "month": 1}', '2026-01-01 00:00:00+01', '2026-01-01 23:59:59+01', 62),
('holiday_easter_2026', 'Velikonoční energie', 'Trénink během Velikonoc', 'Epic', 'egg', 'holiday', '{"easter": true}', '2026-04-03 00:00:00+02', '2026-04-06 23:59:59+02', 63),
('holiday_labor_2026', 'Svátek práce', 'Trénink 1. května', 'Rare', 'hammer', 'holiday', '{"day": 1, "month": 5}', '2026-05-01 00:00:00+02', '2026-05-01 23:59:59+02', 64),
('holiday_freedom_2025', 'Den boje za svobodu', 'Trénink 17. listopadu', 'Rare', 'flag', 'holiday', '{"day": 17, "month": 11}', '2025-11-17 00:00:00+01', '2025-11-17 23:59:59+01', 65);
