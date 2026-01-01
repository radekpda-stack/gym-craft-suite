-- =============================================
-- CHALLENGE METRICS EXTENSION
-- =============================================

-- Add new columns to challenges table for universal metrics
ALTER TABLE public.challenges
ADD COLUMN IF NOT EXISTS ranking_mode text DEFAULT 'top3' CHECK (ranking_mode IN ('top1', 'top3')),
ADD COLUMN IF NOT EXISTS tie_breaker text DEFAULT 'earliest_submission' CHECK (tie_breaker IN ('earliest_submission', 'coach_confirmed_first', 'same_rank'));

-- Add winner tracking columns to challenge_submissions
ALTER TABLE public.challenge_submissions
ADD COLUMN IF NOT EXISTS result_value numeric,
ADD COLUMN IF NOT EXISTS result_display text,
ADD COLUMN IF NOT EXISTS confirmed_by text DEFAULT 'client' CHECK (confirmed_by IN ('coach', 'client')),
ADD COLUMN IF NOT EXISTS is_winner boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS winner_rank integer,
ADD COLUMN IF NOT EXISTS awarded_at timestamptz,
ADD COLUMN IF NOT EXISTS xp_awarded integer DEFAULT 0;

-- Update existing submissions - map score_primary to result_value
UPDATE public.challenge_submissions SET result_value = score_primary WHERE result_value IS NULL;

-- =============================================
-- PR (PERSONAL RECORDS) SYSTEM
-- =============================================

-- PR Definitions table
CREATE TABLE IF NOT EXISTS public.pr_definitions (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  metric_type text NOT NULL CHECK (metric_type IN ('time', 'weight', 'reps', 'distance', 'power', 'score')),
  unit text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('lower_is_better', 'higher_is_better')),
  scope text DEFAULT 'both' CHECK (scope IN ('challenge', 'workout', 'both')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Client PRs - current best per client/pr_definition
CREATE TABLE IF NOT EXISTS public.client_prs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  pr_definition_id text NOT NULL REFERENCES public.pr_definitions(id) ON DELETE CASCADE,
  best_value numeric NOT NULL,
  best_display text NOT NULL,
  achieved_at timestamptz NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('challenge', 'workout')),
  source_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, pr_definition_id)
);

-- PR History for tracking improvements
CREATE TABLE IF NOT EXISTS public.pr_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  pr_definition_id text NOT NULL REFERENCES public.pr_definitions(id) ON DELETE CASCADE,
  value numeric NOT NULL,
  display text NOT NULL,
  achieved_at timestamptz NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('challenge', 'workout')),
  source_id uuid,
  xp_awarded integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- XP Events table for tracking all XP awards
CREATE TABLE IF NOT EXISTS public.xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_id uuid,
  xp_amount integer NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pr_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_prs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pr_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pr_definitions (read-only for everyone)
CREATE POLICY "Anyone can read active PR definitions"
ON public.pr_definitions FOR SELECT
USING (is_active = true);

-- RLS Policies for client_prs
CREATE POLICY "Clients can view their own PRs"
ON public.client_prs FOR SELECT
USING (true);

CREATE POLICY "System can insert client PRs"
ON public.client_prs FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update client PRs"
ON public.client_prs FOR UPDATE
USING (true);

-- RLS Policies for pr_history
CREATE POLICY "Clients can view their own PR history"
ON public.pr_history FOR SELECT
USING (true);

CREATE POLICY "System can insert PR history"
ON public.pr_history FOR INSERT
WITH CHECK (true);

-- RLS Policies for xp_events
CREATE POLICY "Clients can view their own XP events"
ON public.xp_events FOR SELECT
USING (true);

CREATE POLICY "System can insert XP events"
ON public.xp_events FOR INSERT
WITH CHECK (true);

-- =============================================
-- NEW BADGE DEFINITIONS
-- =============================================

-- Insert challenge-related badges
INSERT INTO public.badge_definitions (id, name, description, rarity, icon_key, style, rule_type, rule_value, is_active, display_order)
VALUES
  -- Challenge participation & winning
  ('challenger', 'Challenger', 'První účast v challenge', 'Uncommon', 'flag', 'minimal', 'special', '{"type": "challenge_participation", "count": 1}', true, 100),
  ('podium_finisher', 'Podium Finisher', 'Top 3 umístění v challenge', 'Rare', 'podium', 'minimal', 'special', '{"type": "challenge_top3", "count": 1}', true, 101),
  ('gold_medal', 'Gold Medal', '1. místo v challenge', 'Epic', 'medal_gold', 'minimal', 'special', '{"type": "challenge_rank", "rank": 1}', true, 102),
  ('silver_medal', 'Silver Medal', '2. místo v challenge', 'Epic', 'medal_silver', 'minimal', 'special', '{"type": "challenge_rank", "rank": 2}', true, 103),
  ('bronze_medal', 'Bronze Medal', '3. místo v challenge', 'Epic', 'medal_bronze', 'minimal', 'special', '{"type": "challenge_rank", "rank": 3}', true, 104),
  ('hat_trick_winner', 'Hat-trick Winner', '3× první místo v challenges', 'Legendary', 'crown', 'minimal', 'special', '{"type": "challenge_wins", "count": 3}', true, 105),
  
  -- PR badges
  ('first_pr', 'PR!', 'První osobní rekord', 'Uncommon', 'bolt', 'minimal', 'special', '{"type": "pr_count", "count": 1}', true, 110),
  ('pr_streak', 'PR Streak', '3 nové PR za 30 dní', 'Rare', 'bolt_3', 'minimal', 'special', '{"type": "pr_streak_30d", "count": 3}', true, 111),
  ('pr_machine', 'PR Machine', '10 osobních rekordů celkem', 'Epic', 'bolt_10', 'minimal', 'special', '{"type": "pr_count", "count": 10}', true, 112),
  ('record_hunter', 'Record Hunter', 'Nový PR v challenge', 'Rare', 'target', 'minimal', 'special', '{"type": "pr_in_challenge", "count": 1}', true, 113),
  ('training_pr', 'Training PR', 'Nový PR mimo challenge', 'Uncommon', 'wrench', 'minimal', 'special', '{"type": "pr_in_workout", "count": 1}', true, 114)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- DEFAULT PR DEFINITIONS
-- =============================================

INSERT INTO public.pr_definitions (id, name, metric_type, unit, direction, scope)
VALUES
  -- Time-based (lower is better)
  ('row_500m', 'Row 500m', 'time', 's', 'lower_is_better', 'both'),
  ('row_1000m', 'Row 1000m', 'time', 's', 'lower_is_better', 'both'),
  ('row_2000m', 'Row 2000m', 'time', 's', 'lower_is_better', 'both'),
  ('run_1km', 'Run 1km', 'time', 's', 'lower_is_better', 'both'),
  ('run_5km', 'Run 5km', 'time', 's', 'lower_is_better', 'both'),
  ('bike_erg_1km', 'Bike Erg 1km', 'time', 's', 'lower_is_better', 'both'),
  
  -- Weight-based (higher is better)
  ('bench_press_1rm', 'Bench Press 1RM', 'weight', 'kg', 'higher_is_better', 'both'),
  ('squat_1rm', 'Squat 1RM', 'weight', 'kg', 'higher_is_better', 'both'),
  ('deadlift_1rm', 'Deadlift 1RM', 'weight', 'kg', 'higher_is_better', 'both'),
  ('overhead_press_1rm', 'Overhead Press 1RM', 'weight', 'kg', 'higher_is_better', 'both'),
  
  -- Reps-based (higher is better)
  ('pushups_max', 'Push-ups Max', 'reps', 'reps', 'higher_is_better', 'both'),
  ('pullups_max', 'Pull-ups Max', 'reps', 'reps', 'higher_is_better', 'both'),
  ('burpees_1min', 'Burpees / 1 min', 'reps', 'reps', 'higher_is_better', 'both'),
  
  -- Power-based
  ('row_max_watts', 'Row Max Watts', 'power', 'W', 'higher_is_better', 'both'),
  ('bike_max_watts', 'Bike Max Watts', 'power', 'W', 'higher_is_better', 'both')
ON CONFLICT (id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_prs_client_id ON public.client_prs(client_id);
CREATE INDEX IF NOT EXISTS idx_pr_history_client_id ON public.pr_history(client_id);
CREATE INDEX IF NOT EXISTS idx_pr_history_achieved_at ON public.pr_history(achieved_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_events_client_id ON public.xp_events(client_id);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_winner ON public.challenge_submissions(challenge_id, is_winner) WHERE is_winner = true;