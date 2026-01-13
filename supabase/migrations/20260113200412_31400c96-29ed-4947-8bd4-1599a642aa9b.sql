-- =====================================================
-- PHASE 1: PUBLIC CHALLENGES - MULTI-METRIC SYSTEM
-- =====================================================

-- 1) Add new columns to challenges table for public & multi-metric support
ALTER TABLE public.challenges 
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS public_slug text UNIQUE,
ADD COLUMN IF NOT EXISTS public_settings jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS require_photo_proof boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS metrics_config jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS leaderboard_config jsonb DEFAULT '{"primary_metric_key": null, "direction": "max", "tie_breakers": []}';

-- Create index for public slug lookups
CREATE INDEX IF NOT EXISTS idx_challenges_public_slug ON public.challenges(public_slug) WHERE is_public = true;

-- 2) Guest profiles for public challenge participants
CREATE TABLE IF NOT EXISTS public.challenge_guest_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  sex text CHECK (sex IN ('male', 'female')),
  age integer CHECK (age > 0 AND age < 150),
  weight_kg numeric(5,2) CHECK (weight_kg > 0 AND weight_kg < 500),
  height_cm numeric(5,1) CHECK (height_cm > 0 AND height_cm < 300),
  email text,
  participant_token_hash text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guest_profiles_challenge ON public.challenge_guest_profiles(challenge_id);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_token_hash ON public.challenge_guest_profiles(participant_token_hash);

-- 3) Public challenge results (supports both guests and clients)
CREATE TABLE IF NOT EXISTS public.challenge_public_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  guest_profile_id uuid REFERENCES public.challenge_guest_profiles(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  metrics_data jsonb NOT NULL DEFAULT '{}',
  photo_urls text[] DEFAULT '{}',
  submitted_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_verified boolean DEFAULT false,
  
  -- Either guest or client, not both
  CONSTRAINT check_participant_type CHECK (
    (guest_profile_id IS NOT NULL AND client_id IS NULL) OR
    (guest_profile_id IS NULL AND client_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_public_results_challenge ON public.challenge_public_results(challenge_id);
CREATE INDEX IF NOT EXISTS idx_public_results_guest ON public.challenge_public_results(guest_profile_id);
CREATE INDEX IF NOT EXISTS idx_public_results_client ON public.challenge_public_results(client_id);
CREATE INDEX IF NOT EXISTS idx_public_results_submitted ON public.challenge_public_results(submitted_at DESC);

-- 4) Reactions on results
CREATE TABLE IF NOT EXISTS public.challenge_result_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id uuid NOT NULL REFERENCES public.challenge_public_results(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('like', '💪', '🔥', '👏', '🤯', '😄')),
  visitor_token_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  -- One reaction type per visitor per result
  UNIQUE(result_id, reaction_type, visitor_token_hash)
);

CREATE INDEX IF NOT EXISTS idx_reactions_result ON public.challenge_result_reactions(result_id);

-- 5) Chat messages for public challenges
CREATE TABLE IF NOT EXISTS public.challenge_public_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  guest_profile_id uuid REFERENCES public.challenge_guest_profiles(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  message text NOT NULL CHECK (char_length(message) <= 300),
  created_at timestamptz DEFAULT now(),
  
  -- Author must be either guest or client
  CONSTRAINT check_chat_author CHECK (
    guest_profile_id IS NOT NULL OR client_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_public_chat_challenge ON public.challenge_public_chat(challenge_id, created_at DESC);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_public_chat;

-- 6) Public views for safe data exposure

-- View: Public challenge info (no sensitive data)
CREATE OR REPLACE VIEW public.vw_public_challenge AS
SELECT 
  c.id,
  c.title,
  c.description,
  c.instructions,
  c.start_at,
  c.end_at,
  c.public_slug,
  c.require_photo_proof,
  c.metrics_config,
  c.leaderboard_config,
  c.public_settings,
  c.status,
  c.vod_url
FROM public.challenges c
WHERE c.is_public = true AND c.public_slug IS NOT NULL;

-- View: Public leaderboard with initials only
CREATE OR REPLACE VIEW public.vw_public_leaderboard AS
SELECT 
  r.id as result_id,
  r.challenge_id,
  r.metrics_data,
  r.photo_urls,
  r.submitted_at,
  r.is_verified,
  CASE 
    WHEN r.guest_profile_id IS NOT NULL THEN 
      UPPER(LEFT(g.first_name, 1)) || '. ' || UPPER(LEFT(g.last_name, 1)) || '.'
    WHEN r.client_id IS NOT NULL THEN 
      UPPER(LEFT(cl.name, 1)) || '. ' || UPPER(LEFT(SPLIT_PART(cl.name, ' ', 2), 1)) || '.'
    ELSE 'A. N.'
  END as display_initials,
  CASE WHEN r.guest_profile_id IS NOT NULL THEN 'guest' ELSE 'client' END as participant_type,
  COALESCE(g.sex, cl.gender) as sex,
  g.age as guest_age,
  (SELECT COUNT(*) FROM public.challenge_result_reactions rr WHERE rr.result_id = r.id AND rr.reaction_type = 'like') as like_count,
  (SELECT COUNT(*) FROM public.challenge_result_reactions rr WHERE rr.result_id = r.id AND rr.reaction_type = '💪') as muscle_count,
  (SELECT COUNT(*) FROM public.challenge_result_reactions rr WHERE rr.result_id = r.id AND rr.reaction_type = '🔥') as fire_count,
  (SELECT COUNT(*) FROM public.challenge_result_reactions rr WHERE rr.result_id = r.id AND rr.reaction_type = '👏') as clap_count,
  (SELECT COUNT(*) FROM public.challenge_result_reactions rr WHERE rr.result_id = r.id AND rr.reaction_type = '🤯') as mind_blown_count,
  (SELECT COUNT(*) FROM public.challenge_result_reactions rr WHERE rr.result_id = r.id AND rr.reaction_type = '😄') as smile_count
FROM public.challenge_public_results r
LEFT JOIN public.challenge_guest_profiles g ON r.guest_profile_id = g.id
LEFT JOIN public.clients cl ON r.client_id = cl.id
JOIN public.challenges c ON r.challenge_id = c.id
WHERE c.is_public = true;

-- View: Public chat with initials only
CREATE OR REPLACE VIEW public.vw_public_chat AS
SELECT 
  m.id,
  m.challenge_id,
  m.message,
  m.created_at,
  CASE 
    WHEN m.guest_profile_id IS NOT NULL THEN 
      UPPER(LEFT(g.first_name, 1)) || '. ' || UPPER(LEFT(g.last_name, 1)) || '.'
    WHEN m.client_id IS NOT NULL THEN 
      UPPER(LEFT(cl.name, 1)) || '. ' || UPPER(LEFT(SPLIT_PART(cl.name, ' ', 2), 1)) || '.'
    ELSE 'A. N.'
  END as author_initials,
  CASE WHEN m.guest_profile_id IS NOT NULL THEN 'guest' ELSE 'client' END as author_type
FROM public.challenge_public_chat m
LEFT JOIN public.challenge_guest_profiles g ON m.guest_profile_id = g.id
LEFT JOIN public.clients cl ON m.client_id = cl.id
JOIN public.challenges c ON m.challenge_id = c.id
WHERE c.is_public = true;

-- 7) RLS Policies

-- Guest profiles: public read for same challenge, write via edge function only
ALTER TABLE public.challenge_guest_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read guest profiles for public challenges"
ON public.challenge_guest_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.challenges c 
    WHERE c.id = challenge_id AND c.is_public = true
  )
);

-- Public results: public read, write via edge function
ALTER TABLE public.challenge_public_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read public results"
ON public.challenge_public_results FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.challenges c 
    WHERE c.id = challenge_id AND c.is_public = true
  )
);

CREATE POLICY "Clients can insert their own results"
ON public.challenge_public_results FOR INSERT
WITH CHECK (
  client_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.clients cl 
    WHERE cl.id = client_id 
    AND EXISTS (
      SELECT 1 FROM public.client_accounts ca 
      WHERE ca.client_id = cl.id 
      AND ca.auth_user_id = auth.uid()
    )
  )
);

-- Reactions: public read, public insert (anti-spam via unique constraint)
ALTER TABLE public.challenge_result_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reactions"
ON public.challenge_result_reactions FOR SELECT
USING (true);

-- Chat: public read for public challenges
ALTER TABLE public.challenge_public_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read public chat"
ON public.challenge_public_chat FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.challenges c 
    WHERE c.id = challenge_id AND c.is_public = true
  )
);

CREATE POLICY "Clients can post to public chat"
ON public.challenge_public_chat FOR INSERT
WITH CHECK (
  client_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.clients cl 
    WHERE cl.id = client_id 
    AND EXISTS (
      SELECT 1 FROM public.client_accounts ca 
      WHERE ca.client_id = cl.id 
      AND ca.auth_user_id = auth.uid()
    )
  )
);

-- 8) Statistics RPC function
CREATE OR REPLACE FUNCTION public.get_public_challenge_stats(p_challenge_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  metrics_cfg jsonb;
  primary_key text;
BEGIN
  -- Get challenge config
  SELECT metrics_config, (leaderboard_config->>'primary_metric_key')::text
  INTO metrics_cfg, primary_key
  FROM challenges
  WHERE id = p_challenge_id AND is_public = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Challenge not found');
  END IF;

  SELECT jsonb_build_object(
    'total_participants', (
      SELECT COUNT(DISTINCT COALESCE(guest_profile_id::text, client_id::text))
      FROM challenge_public_results
      WHERE challenge_id = p_challenge_id
    ),
    'total_results', (
      SELECT COUNT(*)
      FROM challenge_public_results
      WHERE challenge_id = p_challenge_id
    ),
    'guest_count', (
      SELECT COUNT(*)
      FROM challenge_guest_profiles
      WHERE challenge_id = p_challenge_id
    ),
    'client_count', (
      SELECT COUNT(DISTINCT client_id)
      FROM challenge_public_results
      WHERE challenge_id = p_challenge_id AND client_id IS NOT NULL
    ),
    'gender_breakdown', (
      SELECT jsonb_build_object(
        'male', COUNT(*) FILTER (WHERE COALESCE(g.sex, cl.gender) = 'male'),
        'female', COUNT(*) FILTER (WHERE COALESCE(g.sex, cl.gender) = 'female'),
        'unknown', COUNT(*) FILTER (WHERE COALESCE(g.sex, cl.gender) IS NULL)
      )
      FROM challenge_public_results r
      LEFT JOIN challenge_guest_profiles g ON r.guest_profile_id = g.id
      LEFT JOIN clients cl ON r.client_id = cl.id
      WHERE r.challenge_id = p_challenge_id
    ),
    'primary_metric_stats', (
      SELECT jsonb_build_object(
        'min', MIN((metrics_data->>primary_key)::numeric),
        'max', MAX((metrics_data->>primary_key)::numeric),
        'avg', AVG((metrics_data->>primary_key)::numeric),
        'median', PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (metrics_data->>primary_key)::numeric)
      )
      FROM challenge_public_results
      WHERE challenge_id = p_challenge_id 
      AND metrics_data->>primary_key IS NOT NULL
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 9) Generate unique public slug function
CREATE OR REPLACE FUNCTION public.generate_public_slug()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- 10) Updated_at trigger for new tables
CREATE TRIGGER update_challenge_guest_profiles_updated_at
  BEFORE UPDATE ON public.challenge_guest_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_challenge_public_results_updated_at
  BEFORE UPDATE ON public.challenge_public_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();