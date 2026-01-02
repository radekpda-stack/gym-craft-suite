-- Fix: Replace overly permissive RLS policies on xp_events

-- Drop the overly permissive policy that allows anyone to read xp_events
DROP POLICY IF EXISTS "Clients can view their own XP events" ON public.xp_events;

-- Create proper restrictive policy for xp_events
CREATE POLICY "Clients can view their own XP events via portal auth"
ON public.xp_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_accounts ca
    WHERE ca.client_id = xp_events.client_id
    AND ca.auth_user_id = auth.uid()
  )
);

-- Create policy for trainers to view their clients' XP events
CREATE POLICY "Trainers can view client XP events"
ON public.xp_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = xp_events.client_id
    AND c.user_id = auth.uid()
  )
);