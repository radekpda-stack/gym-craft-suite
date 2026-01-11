-- Fix client_accounts RLS policy - change from public to authenticated

DROP POLICY IF EXISTS "Clients see own active account" ON public.client_accounts;

CREATE POLICY "Clients see own active account" ON public.client_accounts
FOR SELECT TO authenticated
USING ((auth_user_id = auth.uid()) AND (status = 'active'::text));