-- Fix the RLS policy for peer_challenges INSERT
-- The existing policy has a bug: (ca.trainer_id = ca.trainer_id) instead of (ca.trainer_id = peer_challenges.trainer_id)

DROP POLICY IF EXISTS "Clients can create peer challenges" ON peer_challenges;

CREATE POLICY "Clients can create peer challenges"
ON peer_challenges
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM client_accounts ca
    WHERE ca.auth_user_id = auth.uid()
      AND ca.client_id = peer_challenges.created_by_client_id
      AND ca.trainer_id = peer_challenges.trainer_id
  )
);