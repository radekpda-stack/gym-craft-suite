-- Helper: can current authenticated client view a given peer challenge?
CREATE OR REPLACE FUNCTION public.can_client_view_peer_challenge(p_challenge_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM peer_challenges pc
    JOIN client_accounts ca
      ON ca.trainer_id = pc.trainer_id
    WHERE ca.auth_user_id = auth.uid()
      AND pc.id = p_challenge_id
      AND (
        pc.challenge_type = 'public'
        OR pc.created_by_client_id = ca.client_id
        OR EXISTS (
          SELECT 1
          FROM peer_challenge_participants p
          WHERE p.challenge_id = pc.id
            AND p.client_id = ca.client_id
        )
      )
  )
$$;

-- Helper: can current authenticated client add themselves/others as participant?
CREATE OR REPLACE FUNCTION public.can_client_add_peer_challenge_participant(p_challenge_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM peer_challenges pc
    JOIN client_accounts ca
      ON ca.trainer_id = pc.trainer_id
    WHERE ca.auth_user_id = auth.uid()
      AND pc.id = p_challenge_id
      AND (
        pc.challenge_type = 'public'
        OR pc.created_by_client_id = ca.client_id
      )
  )
$$;

-- Helper: can current trainer manage a peer challenge?
CREATE OR REPLACE FUNCTION public.can_trainer_manage_peer_challenge(p_challenge_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM peer_challenges pc
    WHERE pc.id = p_challenge_id
      AND pc.trainer_id = auth.uid()
  )
$$;

-- Replace peer_challenges SELECT policy to avoid cross-policy recursion
DROP POLICY IF EXISTS "Clients can view peer challenges" ON public.peer_challenges;
CREATE POLICY "Clients can view peer challenges"
ON public.peer_challenges
FOR SELECT
USING (public.can_client_view_peer_challenge(id));

-- Fix peer_challenge_participants policies (remove self-referencing EXISTS + peer_challenges joins)
DROP POLICY IF EXISTS "Clients can view participants" ON public.peer_challenge_participants;
CREATE POLICY "Clients can view participants"
ON public.peer_challenge_participants
FOR SELECT
USING (public.can_client_view_peer_challenge(challenge_id));

DROP POLICY IF EXISTS "Clients can add participants" ON public.peer_challenge_participants;
CREATE POLICY "Clients can add participants"
ON public.peer_challenge_participants
FOR INSERT
WITH CHECK (public.can_client_add_peer_challenge_participant(challenge_id));

-- Optional: avoid recursion for trainers too
DROP POLICY IF EXISTS "Trainers can view participants" ON public.peer_challenge_participants;
CREATE POLICY "Trainers can view participants"
ON public.peer_challenge_participants
FOR SELECT
USING (public.can_trainer_manage_peer_challenge(challenge_id));

DROP POLICY IF EXISTS "Trainers can add participants" ON public.peer_challenge_participants;
CREATE POLICY "Trainers can add participants"
ON public.peer_challenge_participants
FOR INSERT
WITH CHECK (public.can_trainer_manage_peer_challenge(challenge_id));

-- Optional: avoid recursion for activity log policies
DROP POLICY IF EXISTS "Trainers can view activity log" ON public.peer_challenge_activity_log;
CREATE POLICY "Trainers can view activity log"
ON public.peer_challenge_activity_log
FOR SELECT
USING (public.can_trainer_manage_peer_challenge(challenge_id));

DROP POLICY IF EXISTS "Trainers can log activity" ON public.peer_challenge_activity_log;
CREATE POLICY "Trainers can log activity"
ON public.peer_challenge_activity_log
FOR INSERT
WITH CHECK (public.can_trainer_manage_peer_challenge(challenge_id));
