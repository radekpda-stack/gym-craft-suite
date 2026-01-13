-- Fix SECURITY DEFINER views - recreate as SECURITY INVOKER

-- Drop and recreate views with SECURITY INVOKER
DROP VIEW IF EXISTS public.vw_public_challenge;
DROP VIEW IF EXISTS public.vw_public_leaderboard;
DROP VIEW IF EXISTS public.vw_public_chat;

-- View: Public challenge info (no sensitive data) - SECURITY INVOKER
CREATE VIEW public.vw_public_challenge 
WITH (security_invoker = true)
AS
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

-- View: Public leaderboard with initials only - SECURITY INVOKER
CREATE VIEW public.vw_public_leaderboard 
WITH (security_invoker = true)
AS
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

-- View: Public chat with initials only - SECURITY INVOKER
CREATE VIEW public.vw_public_chat 
WITH (security_invoker = true)
AS
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

-- Fix generate_public_slug function with search_path
DROP FUNCTION IF EXISTS public.generate_public_slug();
CREATE FUNCTION public.generate_public_slug()
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
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

-- Create storage bucket for challenge proofs (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'challenge-proofs', 
  'challenge-proofs', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for challenge-proofs bucket
CREATE POLICY "Anyone can view challenge proof images"
ON storage.objects FOR SELECT
USING (bucket_id = 'challenge-proofs');

CREATE POLICY "Authenticated users can upload challenge proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'challenge-proofs' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Service role can manage all challenge proofs"
ON storage.objects FOR ALL
USING (bucket_id = 'challenge-proofs')
WITH CHECK (bucket_id = 'challenge-proofs');

-- Grant access to views for anon role (public access)
GRANT SELECT ON public.vw_public_challenge TO anon;
GRANT SELECT ON public.vw_public_leaderboard TO anon;
GRANT SELECT ON public.vw_public_chat TO anon;

-- Grant execute on stats function
GRANT EXECUTE ON FUNCTION public.get_public_challenge_stats(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.generate_public_slug() TO authenticated;