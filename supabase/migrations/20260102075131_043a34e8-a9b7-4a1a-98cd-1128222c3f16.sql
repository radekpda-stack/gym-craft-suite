-- =====================================
-- GAMIFICATION SYSTEM - PART 1: Tables and columns
-- =====================================

-- 1) Extend xp_events with meta column
ALTER TABLE public.xp_events 
ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}';

-- Add index for source_id idempotency checks
CREATE INDEX IF NOT EXISTS idx_xp_events_source ON public.xp_events (client_id, source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_created_at ON public.xp_events (client_id, created_at DESC);

-- 2) Add xp_bonus to badge_definitions
ALTER TABLE public.badge_definitions 
ADD COLUMN IF NOT EXISTS xp_bonus integer DEFAULT 0;

-- Set default XP bonuses based on rarity
UPDATE public.badge_definitions SET xp_bonus = 25 WHERE rarity = 'Common' AND xp_bonus = 0;
UPDATE public.badge_definitions SET xp_bonus = 50 WHERE rarity = 'Rare' AND xp_bonus = 0;
UPDATE public.badge_definitions SET xp_bonus = 100 WHERE rarity = 'Epic' AND xp_bonus = 0;
UPDATE public.badge_definitions SET xp_bonus = 150 WHERE rarity = 'Legendary' AND xp_bonus = 0;

-- 3) Extend rule_type check to include new types
ALTER TABLE public.badge_definitions 
DROP CONSTRAINT IF EXISTS badge_definitions_rule_type_check;

ALTER TABLE public.badge_definitions 
ADD CONSTRAINT badge_definitions_rule_type_check CHECK (
  rule_type = ANY (ARRAY[
    'milestone_total', 'streak_weeks', 'type_count', 'special', 'seasonal', 'holiday',
    'shop_category', 'lp_milestone', 'challenge', 'xp_milestone'
  ]::text[])
);

-- 4) Create client_xp table for level tracking
CREATE TABLE IF NOT EXISTS public.client_xp (
  client_id uuid PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  total_xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  level_xp integer NOT NULL DEFAULT 0,
  xp_to_next integer NOT NULL DEFAULT 100,
  last_xp_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_xp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view client XP" ON public.client_xp
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_xp.client_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Clients can view own XP" ON public.client_xp
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.client_accounts ca WHERE ca.client_id = client_xp.client_id AND ca.auth_user_id = auth.uid())
  );

CREATE POLICY "System can manage XP" ON public.client_xp
  FOR ALL USING (true) WITH CHECK (true);

-- 5) Create loyalty_ledger for LP transactions
CREATE TABLE IF NOT EXISTS public.loyalty_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_id uuid,
  points integer NOT NULL,
  meta jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_client ON public.loyalty_ledger (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_source ON public.loyalty_ledger (source_type, source_id);

ALTER TABLE public.loyalty_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view LP ledger" ON public.loyalty_ledger
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = loyalty_ledger.client_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Clients can view own LP ledger" ON public.loyalty_ledger
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.client_accounts ca WHERE ca.client_id = loyalty_ledger.client_id AND ca.auth_user_id = auth.uid())
  );

CREATE POLICY "System can manage LP ledger" ON public.loyalty_ledger
  FOR ALL USING (true) WITH CHECK (true);

-- 6) Create loyalty_balance for LP balance tracking
CREATE TABLE IF NOT EXISTS public.loyalty_balance (
  client_id uuid PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  points_balance integer NOT NULL DEFAULT 0,
  lifetime_points integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_balance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view LP balance" ON public.loyalty_balance
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = loyalty_balance.client_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Clients can view own LP balance" ON public.loyalty_balance
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.client_accounts ca WHERE ca.client_id = loyalty_balance.client_id AND ca.auth_user_id = auth.uid())
  );

CREATE POLICY "System can manage LP balance" ON public.loyalty_balance
  FOR ALL USING (true) WITH CHECK (true);

-- 7) Weekly streak tracking table
CREATE TABLE IF NOT EXISTS public.weekly_streak_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  week_key text NOT NULL,
  threshold integer NOT NULL,
  xp_amount integer NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, week_key, threshold)
);

ALTER TABLE public.weekly_streak_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view streak claims" ON public.weekly_streak_claims
  FOR SELECT USING (true);

CREATE POLICY "System can manage streak claims" ON public.weekly_streak_claims
  FOR ALL USING (true) WITH CHECK (true);

-- 8) Function to calculate level from total XP
CREATE OR REPLACE FUNCTION public.calculate_xp_level(p_total_xp integer)
RETURNS TABLE(level integer, level_xp integer, xp_to_next integer) AS $$
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
$$ LANGUAGE plpgsql IMMUTABLE;

-- 9) Function to recalculate client_xp from xp_events
CREATE OR REPLACE FUNCTION public.recalculate_client_xp(p_client_id uuid)
RETURNS void AS $$
DECLARE
  v_total_xp integer;
  v_level_data record;
BEGIN
  SELECT COALESCE(SUM(xp_amount), 0) INTO v_total_xp FROM public.xp_events WHERE client_id = p_client_id;
  SELECT * INTO v_level_data FROM public.calculate_xp_level(v_total_xp);
  INSERT INTO public.client_xp (client_id, total_xp, level, level_xp, xp_to_next, updated_at)
  VALUES (p_client_id, v_total_xp, v_level_data.level, v_level_data.level_xp, v_level_data.xp_to_next, now())
  ON CONFLICT (client_id) DO UPDATE SET
    total_xp = v_total_xp,
    level = v_level_data.level,
    level_xp = v_level_data.level_xp,
    xp_to_next = v_level_data.xp_to_next,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10) Function to recalculate loyalty_balance from loyalty_ledger
CREATE OR REPLACE FUNCTION public.recalculate_loyalty_balance(p_client_id uuid)
RETURNS void AS $$
DECLARE
  v_balance integer;
  v_lifetime integer;
BEGIN
  SELECT COALESCE(SUM(points), 0), COALESCE(SUM(CASE WHEN points > 0 THEN points ELSE 0 END), 0)
  INTO v_balance, v_lifetime FROM public.loyalty_ledger WHERE client_id = p_client_id;
  INSERT INTO public.loyalty_balance (client_id, points_balance, lifetime_points, updated_at)
  VALUES (p_client_id, v_balance, v_lifetime, now())
  ON CONFLICT (client_id) DO UPDATE SET points_balance = v_balance, lifetime_points = v_lifetime, updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;