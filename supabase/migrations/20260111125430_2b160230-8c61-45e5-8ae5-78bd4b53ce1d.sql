-- Fix test_sessions RLS policies - change from public to authenticated
-- Also add policy for clients to view their own test sessions

DROP POLICY IF EXISTS "Users can delete own test sessions" ON public.test_sessions;
DROP POLICY IF EXISTS "Users can insert own test sessions" ON public.test_sessions;
DROP POLICY IF EXISTS "Users can update own test sessions" ON public.test_sessions;
DROP POLICY IF EXISTS "Users can view own test sessions" ON public.test_sessions;

-- Trainers can manage test sessions for their clients
CREATE POLICY "Trainers can insert test sessions" ON public.test_sessions
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Trainers can update test sessions" ON public.test_sessions
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Trainers can delete test sessions" ON public.test_sessions
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Trainers can view test sessions" ON public.test_sessions
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Clients can view their own test sessions via client portal
CREATE POLICY "Clients can view own test sessions" ON public.test_sessions
FOR SELECT TO authenticated
USING (client_id = get_client_id_for_user(auth.uid()));