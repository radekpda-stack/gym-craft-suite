-- Add RLS policies for clients accessing their own workout logs via portal
-- Client portal uses client_accounts.auth_user_id to identify clients

-- Helper function to get client_id from auth user (for portal access)
CREATE OR REPLACE FUNCTION public.get_client_id_for_portal_user()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ca.client_id
  FROM public.client_accounts ca
  WHERE ca.auth_user_id = auth.uid()
  AND ca.is_active = true
  LIMIT 1
$$;

-- Clients can view their own workout logs
CREATE POLICY "Clients can view their own workout logs"
ON public.client_workout_logs
FOR SELECT
USING (client_id = public.get_client_id_for_portal_user());

-- Clients can insert their own workout logs
CREATE POLICY "Clients can insert their own workout logs"
ON public.client_workout_logs
FOR INSERT
WITH CHECK (client_id = public.get_client_id_for_portal_user());

-- Clients can update their own workout logs
CREATE POLICY "Clients can update their own workout logs"
ON public.client_workout_logs
FOR UPDATE
USING (client_id = public.get_client_id_for_portal_user());

-- Clients can delete their own workout logs
CREATE POLICY "Clients can delete their own workout logs"
ON public.client_workout_logs
FOR DELETE
USING (client_id = public.get_client_id_for_portal_user());

-- Clients can view exercises from their workout logs
CREATE POLICY "Clients can view their workout exercises"
ON public.client_workout_exercises
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.client_workout_logs wl
    WHERE wl.id = workout_log_id 
    AND wl.client_id = public.get_client_id_for_portal_user()
));

-- Clients can insert exercises to their workout logs
CREATE POLICY "Clients can insert their workout exercises"
ON public.client_workout_exercises
FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.client_workout_logs wl
    WHERE wl.id = workout_log_id 
    AND wl.client_id = public.get_client_id_for_portal_user()
));

-- Clients can update exercises in their workout logs
CREATE POLICY "Clients can update their workout exercises"
ON public.client_workout_exercises
FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM public.client_workout_logs wl
    WHERE wl.id = workout_log_id 
    AND wl.client_id = public.get_client_id_for_portal_user()
));

-- Clients can delete exercises from their workout logs
CREATE POLICY "Clients can delete their workout exercises"
ON public.client_workout_exercises
FOR DELETE
USING (EXISTS (
    SELECT 1 FROM public.client_workout_logs wl
    WHERE wl.id = workout_log_id 
    AND wl.client_id = public.get_client_id_for_portal_user()
));