-- Allow clients to update their own privacy settings in the clients table
CREATE POLICY "Clients can update own privacy settings"
ON public.clients
FOR UPDATE
USING (id = get_client_id_for_user(auth.uid()))
WITH CHECK (id = get_client_id_for_user(auth.uid()));