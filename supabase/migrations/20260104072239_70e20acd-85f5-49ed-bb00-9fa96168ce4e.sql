-- Add RLS policy to allow clients to create their own nutrition sessions
CREATE POLICY "Clients can create own nutrition sessions"
ON public.nutrition_log_sessions
FOR INSERT
WITH CHECK (
  client_id = get_client_id_for_user(auth.uid())
  AND is_self_service = true
);