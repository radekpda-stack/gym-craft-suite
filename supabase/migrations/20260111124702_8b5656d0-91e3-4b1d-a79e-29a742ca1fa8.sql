-- Fix RLS policies that use overly permissive USING (true) or WITH CHECK (true)
-- These policies need proper user/ownership checks

-- 1. app_errors - Allow insert only for authenticated users or edge functions
DROP POLICY IF EXISTS "Users can insert errors" ON public.app_errors;
CREATE POLICY "Users can insert errors" ON public.app_errors
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'service_role');

-- 2. audit_events - Only edge functions should insert (service role)
DROP POLICY IF EXISTS "Allow insert from edge functions" ON public.audit_events;
CREATE POLICY "Allow insert from edge functions" ON public.audit_events
FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- 3. challenge_team_members - Anyone with valid client can join
DROP POLICY IF EXISTS "Anyone can join teams" ON public.challenge_team_members;
CREATE POLICY "Clients can join teams" ON public.challenge_team_members
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_accounts ca
    WHERE ca.client_id = challenge_team_members.client_id
    AND ca.auth_user_id = auth.uid()
  )
);

-- 4. challenge_team_members - Members can leave only their own membership
DROP POLICY IF EXISTS "Members can leave teams" ON public.challenge_team_members;
CREATE POLICY "Members can leave teams" ON public.challenge_team_members
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.client_accounts ca
    WHERE ca.client_id = challenge_team_members.client_id
    AND ca.auth_user_id = auth.uid()
  )
);

-- 5. challenge_teams - Captains can update only their teams
DROP POLICY IF EXISTS "Captains can update their teams" ON public.challenge_teams;
CREATE POLICY "Captains can update their teams" ON public.challenge_teams
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.client_accounts ca
    WHERE ca.client_id = challenge_teams.captain_client_id
    AND ca.auth_user_id = auth.uid()
  )
);

-- 6. challenge_teams - Only valid clients can create teams
DROP POLICY IF EXISTS "Clients can create teams" ON public.challenge_teams;
CREATE POLICY "Clients can create teams" ON public.challenge_teams
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_accounts ca
    WHERE ca.client_id = challenge_teams.captain_client_id
    AND ca.auth_user_id = auth.uid()
  )
);

-- 7. client_prs - System/service role or trainer can insert
DROP POLICY IF EXISTS "System can insert client PRs" ON public.client_prs;
CREATE POLICY "System can insert client PRs" ON public.client_prs
FOR INSERT WITH CHECK (
  auth.role() = 'service_role' 
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_prs.client_id
    AND c.user_id = auth.uid()
  )
);

-- 8. client_prs - System/service role or trainer can update
DROP POLICY IF EXISTS "System can update client PRs" ON public.client_prs;
CREATE POLICY "System can update client PRs" ON public.client_prs
FOR UPDATE USING (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_prs.client_id
    AND c.user_id = auth.uid()
  )
);

-- 9. nutrition_meal_templates - Clients can create their own templates
DROP POLICY IF EXISTS "Clients can create their own templates" ON public.nutrition_meal_templates;
CREATE POLICY "Clients can create their own templates" ON public.nutrition_meal_templates
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_accounts ca
    WHERE ca.client_id = nutrition_meal_templates.client_id
    AND ca.auth_user_id = auth.uid()
  )
);

-- 10. nutrition_meal_templates - Clients can delete their own templates
DROP POLICY IF EXISTS "Clients can delete their own templates" ON public.nutrition_meal_templates;
CREATE POLICY "Clients can delete their own templates" ON public.nutrition_meal_templates
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.client_accounts ca
    WHERE ca.client_id = nutrition_meal_templates.client_id
    AND ca.auth_user_id = auth.uid()
  )
);

-- 11. nutrition_meal_templates - Clients can update their own templates
DROP POLICY IF EXISTS "Clients can update their own templates" ON public.nutrition_meal_templates;
CREATE POLICY "Clients can update their own templates" ON public.nutrition_meal_templates
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.client_accounts ca
    WHERE ca.client_id = nutrition_meal_templates.client_id
    AND ca.auth_user_id = auth.uid()
  )
);

-- 12. performance_metrics - Users can insert their own metrics
DROP POLICY IF EXISTS "Users can insert performance metrics" ON public.performance_metrics;
CREATE POLICY "Users can insert performance metrics" ON public.performance_metrics
FOR INSERT WITH CHECK (user_id = auth.uid());

-- 13. pr_history - System/service role or trainer can insert
DROP POLICY IF EXISTS "System can insert PR history" ON public.pr_history;
CREATE POLICY "System can insert PR history" ON public.pr_history
FOR INSERT WITH CHECK (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = pr_history.client_id
    AND c.user_id = auth.uid()
  )
);

-- 14. xp_events - System/service role or trainer can insert
DROP POLICY IF EXISTS "System can insert XP events" ON public.xp_events;
CREATE POLICY "System can insert XP events" ON public.xp_events
FOR INSERT WITH CHECK (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = xp_events.client_id
    AND c.user_id = auth.uid()
  )
);