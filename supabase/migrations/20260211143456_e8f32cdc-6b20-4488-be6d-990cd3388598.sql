
-- Step 1: Add INSERT policy for app_events
CREATE POLICY "Users can insert own events"
ON public.app_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Step 2: Fix client_portal_activity RLS
DROP POLICY IF EXISTS "Clients can view and create own activity" ON public.client_portal_activity;

CREATE POLICY "Clients can view own activity"
ON public.client_portal_activity FOR SELECT
USING (client_id = get_client_id_for_user(auth.uid()));

CREATE POLICY "Clients can insert own activity"
ON public.client_portal_activity FOR INSERT
WITH CHECK (client_id = get_client_id_for_user(auth.uid()));
