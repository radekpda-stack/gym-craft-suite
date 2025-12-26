-- =====================================================
-- BENCHMARKS & CHALLENGES SYSTEM
-- =====================================================

-- 1) Client privacy settings for benchmarks
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS allow_anonymous_benchmarks boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_challenges_participation boolean DEFAULT false;

-- 2) Trainer comparison settings (stored in app_settings)
-- Will use app_settings table with key 'comparison_settings'

-- 3) Challenges table
CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  instructions text,
  vod_url text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  scoring_type text NOT NULL DEFAULT 'value_higher_better' CHECK (scoring_type IN ('time_lower_better', 'value_higher_better', 'composite')),
  primary_metric text NOT NULL DEFAULT 'reps' CHECK (primary_metric IN ('time_seconds', 'reps', 'rounds', 'weight_kg', 'distance_m', 'calories')),
  secondary_metric text CHECK (secondary_metric IN ('time_seconds', 'reps', 'rounds', 'weight_kg', 'distance_m', 'calories')),
  unit_label text,
  allow_multiple_attempts boolean DEFAULT true,
  requires_video boolean DEFAULT false,
  published_to_portal_clients boolean DEFAULT true,
  created_by_user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4) Challenge submissions table
CREATE TABLE IF NOT EXISTS public.challenge_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  submitted_at timestamptz DEFAULT now(),
  score_primary numeric NOT NULL,
  score_secondary numeric,
  note text,
  video_url text,
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now()
);

-- 5) Challenge pseudonyms for anonymous leaderboard
CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  pseudonym text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(challenge_id, client_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_challenges_status ON public.challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenges_dates ON public.challenges(start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_challenge ON public.challenge_submissions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_client ON public.challenge_submissions(client_id);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_score ON public.challenge_submissions(challenge_id, score_primary);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON public.challenge_participants(challenge_id);

-- 6) Enable RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

-- 7) RLS Policies for challenges
-- Trainer can CRUD their own challenges
CREATE POLICY "Trainers can manage own challenges"
ON public.challenges
FOR ALL
USING (auth.uid() = created_by_user_id);

-- Anyone can view published challenges (for client portal edge functions)
CREATE POLICY "Published challenges are viewable"
ON public.challenges
FOR SELECT
USING (status = 'published');

-- 8) RLS Policies for challenge_submissions
-- Trainers can view all submissions for their challenges
CREATE POLICY "Trainers can view submissions for their challenges"
ON public.challenge_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.challenges c 
    WHERE c.id = challenge_id AND c.created_by_user_id = auth.uid()
  )
);

-- Clients can view their own submissions (via edge function mostly)
CREATE POLICY "Clients can view own submissions"
ON public.challenge_submissions
FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM public.client_accounts WHERE user_id = auth.uid()
  )
);

-- Clients can insert their own submissions
CREATE POLICY "Clients can insert own submissions"
ON public.challenge_submissions
FOR INSERT
WITH CHECK (
  client_id IN (
    SELECT client_id FROM public.client_accounts WHERE user_id = auth.uid()
  )
);

-- 9) RLS Policies for challenge_participants
-- Trainers can view participants for their challenges
CREATE POLICY "Trainers can view participants for their challenges"
ON public.challenge_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.challenges c 
    WHERE c.id = challenge_id AND c.created_by_user_id = auth.uid()
  )
);

-- Participants can view their own entry
CREATE POLICY "Clients can view own participant entry"
ON public.challenge_participants
FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM public.client_accounts WHERE user_id = auth.uid()
  )
);

-- 10) Update timestamp trigger for challenges
CREATE TRIGGER update_challenges_updated_at
BEFORE UPDATE ON public.challenges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 11) Function to generate unique pseudonym for challenge participant
CREATE OR REPLACE FUNCTION public.get_or_create_challenge_pseudonym(
  p_challenge_id uuid,
  p_client_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pseudonym text;
  v_count integer;
BEGIN
  -- Check if pseudonym already exists
  SELECT pseudonym INTO v_pseudonym
  FROM challenge_participants
  WHERE challenge_id = p_challenge_id AND client_id = p_client_id;
  
  IF v_pseudonym IS NOT NULL THEN
    RETURN v_pseudonym;
  END IF;
  
  -- Generate new pseudonym
  SELECT COUNT(*) + 1 INTO v_count
  FROM challenge_participants
  WHERE challenge_id = p_challenge_id;
  
  v_pseudonym := 'Athlete #' || v_count;
  
  -- Insert new participant
  INSERT INTO challenge_participants (challenge_id, client_id, pseudonym)
  VALUES (p_challenge_id, p_client_id, v_pseudonym)
  ON CONFLICT (challenge_id, client_id) DO NOTHING;
  
  -- Return the pseudonym (might have been created by concurrent request)
  SELECT pseudonym INTO v_pseudonym
  FROM challenge_participants
  WHERE challenge_id = p_challenge_id AND client_id = p_client_id;
  
  RETURN v_pseudonym;
END;
$$;

-- 12) Function to calculate exercise benchmark percentile
CREATE OR REPLACE FUNCTION public.calculate_exercise_benchmark(
  p_exercise_name text,
  p_trainer_id uuid,
  p_client_id uuid,
  p_metric_type text DEFAULT 'strength', -- 'strength', 'time', 'distance'
  p_group_key text DEFAULT 'all', -- 'all', 'male', 'female'
  p_min_group_size integer DEFAULT 8
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_client_value numeric;
  v_client_gender text;
  v_values numeric[];
  v_count integer;
  v_percentile numeric;
  v_median numeric;
  v_p25 numeric;
  v_p75 numeric;
BEGIN
  -- Get client's gender if filtering by gender
  IF p_group_key != 'all' THEN
    SELECT gender INTO v_client_gender FROM clients WHERE id = p_client_id;
  END IF;
  
  -- Get client's best value (last 90 days)
  IF p_metric_type = 'strength' THEN
    -- For strength: use weight_kg * (1 + reps/30) as e1RM estimate
    SELECT MAX(weight_kg * (1 + COALESCE(reps, 1)::numeric / 30))
    INTO v_client_value
    FROM exercise_entries
    WHERE client_id = p_client_id
      AND exercise_name ILIKE p_exercise_name
      AND date >= CURRENT_DATE - INTERVAL '90 days'
      AND weight_kg IS NOT NULL
      AND weight_kg > 0;
  ELSIF p_metric_type = 'time' THEN
    -- For time: lower is better, get best (min) time
    SELECT MIN(time_seconds)
    INTO v_client_value
    FROM exercise_entries
    WHERE client_id = p_client_id
      AND exercise_name ILIKE p_exercise_name
      AND date >= CURRENT_DATE - INTERVAL '90 days'
      AND time_seconds IS NOT NULL
      AND time_seconds > 0;
  END IF;
  
  IF v_client_value IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'no_data',
      'message', 'No exercise data found for this client'
    );
  END IF;
  
  -- Get all opt-in clients' values from same trainer
  IF p_metric_type = 'strength' THEN
    SELECT ARRAY_AGG(best_value ORDER BY best_value)
    INTO v_values
    FROM (
      SELECT 
        ee.client_id,
        MAX(ee.weight_kg * (1 + COALESCE(ee.reps, 1)::numeric / 30)) as best_value
      FROM exercise_entries ee
      JOIN clients c ON c.id = ee.client_id
      WHERE ee.user_id = p_trainer_id
        AND ee.exercise_name ILIKE p_exercise_name
        AND ee.date >= CURRENT_DATE - INTERVAL '90 days'
        AND ee.weight_kg IS NOT NULL
        AND ee.weight_kg > 0
        AND c.allow_anonymous_benchmarks = true
        AND (p_group_key = 'all' OR c.gender = p_group_key)
      GROUP BY ee.client_id
    ) sub;
  ELSIF p_metric_type = 'time' THEN
    SELECT ARRAY_AGG(best_value ORDER BY best_value)
    INTO v_values
    FROM (
      SELECT 
        ee.client_id,
        MIN(ee.time_seconds) as best_value
      FROM exercise_entries ee
      JOIN clients c ON c.id = ee.client_id
      WHERE ee.user_id = p_trainer_id
        AND ee.exercise_name ILIKE p_exercise_name
        AND ee.date >= CURRENT_DATE - INTERVAL '90 days'
        AND ee.time_seconds IS NOT NULL
        AND ee.time_seconds > 0
        AND c.allow_anonymous_benchmarks = true
        AND (p_group_key = 'all' OR c.gender = p_group_key)
      GROUP BY ee.client_id
    ) sub;
  END IF;
  
  v_count := COALESCE(array_length(v_values, 1), 0);
  
  -- Check minimum group size
  IF v_count < p_min_group_size THEN
    RETURN jsonb_build_object(
      'error', 'insufficient_data',
      'message', 'Not enough participants for comparison',
      'count', v_count,
      'required', p_min_group_size,
      'client_value', v_client_value
    );
  END IF;
  
  -- Calculate percentile
  IF p_metric_type = 'time' THEN
    -- For time: lower is better, so invert percentile
    SELECT (1 - (COUNT(*) FILTER (WHERE val < v_client_value))::numeric / v_count) * 100
    INTO v_percentile
    FROM unnest(v_values) as val;
  ELSE
    -- For strength: higher is better
    SELECT (COUNT(*) FILTER (WHERE val <= v_client_value))::numeric / v_count * 100
    INTO v_percentile
    FROM unnest(v_values) as val;
  END IF;
  
  -- Calculate median and quartiles
  v_median := v_values[(v_count + 1) / 2];
  v_p25 := v_values[(v_count * 0.25)::integer + 1];
  v_p75 := v_values[(v_count * 0.75)::integer + 1];
  
  RETURN jsonb_build_object(
    'success', true,
    'client_value', v_client_value,
    'percentile', ROUND(v_percentile, 1),
    'median', v_median,
    'p25', v_p25,
    'p75', v_p75,
    'count', v_count,
    'group', p_group_key,
    'metric_type', p_metric_type
  );
END;
$$;

-- 13) Function to get challenge leaderboard (anonymized)
CREATE OR REPLACE FUNCTION public.get_challenge_leaderboard(
  p_challenge_id uuid,
  p_client_id uuid,
  p_min_group_size integer DEFAULT 8
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge record;
  v_count integer;
  v_client_rank integer;
  v_client_score numeric;
  v_client_pseudonym text;
  v_leaderboard jsonb;
  v_client_percentile numeric;
BEGIN
  -- Get challenge info
  SELECT * INTO v_challenge FROM challenges WHERE id = p_challenge_id;
  
  IF v_challenge IS NULL THEN
    RETURN jsonb_build_object('error', 'challenge_not_found');
  END IF;
  
  -- Count participants with approved submissions
  SELECT COUNT(DISTINCT client_id)
  INTO v_count
  FROM challenge_submissions
  WHERE challenge_id = p_challenge_id AND status = 'approved';
  
  -- Check minimum group size
  IF v_count < p_min_group_size THEN
    -- Still return client's own data
    SELECT score_primary INTO v_client_score
    FROM challenge_submissions
    WHERE challenge_id = p_challenge_id AND client_id = p_client_id AND status = 'approved'
    ORDER BY 
      CASE WHEN v_challenge.scoring_type = 'time_lower_better' THEN score_primary END ASC,
      CASE WHEN v_challenge.scoring_type != 'time_lower_better' THEN score_primary END DESC
    LIMIT 1;
    
    RETURN jsonb_build_object(
      'error', 'insufficient_participants',
      'count', v_count,
      'required', p_min_group_size,
      'client_score', v_client_score
    );
  END IF;
  
  -- Get or create client's pseudonym
  v_client_pseudonym := get_or_create_challenge_pseudonym(p_challenge_id, p_client_id);
  
  -- Build leaderboard with ranking
  WITH ranked AS (
    SELECT 
      cs.client_id,
      cp.pseudonym,
      cs.score_primary,
      cs.score_secondary,
      ROW_NUMBER() OVER (
        PARTITION BY cs.client_id 
        ORDER BY 
          CASE WHEN v_challenge.scoring_type = 'time_lower_better' THEN cs.score_primary END ASC,
          CASE WHEN v_challenge.scoring_type != 'time_lower_better' THEN cs.score_primary END DESC,
          cs.score_secondary DESC NULLS LAST
      ) as attempt_rank
    FROM challenge_submissions cs
    JOIN challenge_participants cp ON cp.challenge_id = cs.challenge_id AND cp.client_id = cs.client_id
    WHERE cs.challenge_id = p_challenge_id AND cs.status = 'approved'
  ),
  best_attempts AS (
    SELECT * FROM ranked WHERE attempt_rank = 1
  ),
  final_ranked AS (
    SELECT 
      pseudonym,
      score_primary,
      score_secondary,
      client_id,
      ROW_NUMBER() OVER (
        ORDER BY 
          CASE WHEN v_challenge.scoring_type = 'time_lower_better' THEN score_primary END ASC,
          CASE WHEN v_challenge.scoring_type != 'time_lower_better' THEN score_primary END DESC,
          score_secondary DESC NULLS LAST
      ) as rank
    FROM best_attempts
  )
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'rank', rank,
        'pseudonym', pseudonym,
        'score', score_primary,
        'is_you', client_id = p_client_id
      ) ORDER BY rank
    )
  INTO v_leaderboard
  FROM final_ranked;
  
  -- Get client's rank and percentile
  SELECT rank, score_primary
  INTO v_client_rank, v_client_score
  FROM (
    SELECT 
      client_id,
      score_primary,
      ROW_NUMBER() OVER (
        ORDER BY 
          CASE WHEN v_challenge.scoring_type = 'time_lower_better' THEN score_primary END ASC,
          CASE WHEN v_challenge.scoring_type != 'time_lower_better' THEN score_primary END DESC
      ) as rank
    FROM (
      SELECT DISTINCT ON (client_id) client_id, score_primary
      FROM challenge_submissions
      WHERE challenge_id = p_challenge_id AND status = 'approved'
      ORDER BY client_id,
        CASE WHEN v_challenge.scoring_type = 'time_lower_better' THEN score_primary END ASC,
        CASE WHEN v_challenge.scoring_type != 'time_lower_better' THEN score_primary END DESC
    ) best
  ) ranked
  WHERE client_id = p_client_id;
  
  IF v_client_rank IS NOT NULL THEN
    v_client_percentile := (1 - (v_client_rank - 1)::numeric / v_count) * 100;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'leaderboard', v_leaderboard,
    'total_participants', v_count,
    'client_rank', v_client_rank,
    'client_score', v_client_score,
    'client_percentile', ROUND(v_client_percentile, 1),
    'client_pseudonym', v_client_pseudonym
  );
END;
$$;