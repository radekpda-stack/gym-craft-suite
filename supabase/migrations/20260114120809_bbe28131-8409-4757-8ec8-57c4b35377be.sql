-- Create security definer function to check if client can create peer challenge
CREATE OR REPLACE FUNCTION public.can_client_create_peer_challenge(p_client_id uuid, p_trainer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM client_accounts ca
    WHERE ca.auth_user_id = auth.uid()
      AND ca.client_id = p_client_id
      AND ca.trainer_id = p_trainer_id
  )
$$;

-- Drop the old INSERT policy
DROP POLICY IF EXISTS "Clients can create peer challenges" ON peer_challenges;

-- Create new INSERT policy using the security definer function
CREATE POLICY "Clients can create peer challenges" 
ON peer_challenges 
FOR INSERT 
WITH CHECK (
  public.can_client_create_peer_challenge(created_by_client_id, trainer_id)
);