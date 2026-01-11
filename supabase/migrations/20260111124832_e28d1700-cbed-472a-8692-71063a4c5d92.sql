-- Fix overly permissive RLS policies for INSERT/UPDATE/DELETE operations

-- 1. client_xp - Only system/trainer should manage XP
DROP POLICY IF EXISTS "System can manage XP" ON public.client_xp;

CREATE POLICY "Trainers can manage client XP" ON public.client_xp
FOR ALL USING (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_xp.client_id
    AND c.user_id = auth.uid()
  )
) WITH CHECK (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_xp.client_id
    AND c.user_id = auth.uid()
  )
);

-- 2. external_calendar_events - Only service role or owner
DROP POLICY IF EXISTS "Service role can manage all external events" ON public.external_calendar_events;

CREATE POLICY "Users can manage their own external events" ON public.external_calendar_events
FOR ALL USING (
  auth.role() = 'service_role'
  OR user_id = auth.uid()
) WITH CHECK (
  auth.role() = 'service_role'
  OR user_id = auth.uid()
);

-- 3. loyalty_balance - Only system/trainer
DROP POLICY IF EXISTS "System can manage LP balance" ON public.loyalty_balance;

CREATE POLICY "System can manage LP balance" ON public.loyalty_balance
FOR ALL USING (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = loyalty_balance.client_id
    AND c.user_id = auth.uid()
  )
) WITH CHECK (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = loyalty_balance.client_id
    AND c.user_id = auth.uid()
  )
);

-- 4. loyalty_ledger - Only system/trainer
DROP POLICY IF EXISTS "System can manage LP ledger" ON public.loyalty_ledger;

CREATE POLICY "System can manage LP ledger" ON public.loyalty_ledger
FOR ALL USING (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = loyalty_ledger.client_id
    AND c.user_id = auth.uid()
  )
) WITH CHECK (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = loyalty_ledger.client_id
    AND c.user_id = auth.uid()
  )
);

-- 5. test_benchmarks - These are reference data managed by admins/service role only
-- Regular users should only read, not write
DROP POLICY IF EXISTS "Users can manage their own test benchmarks" ON public.test_benchmarks;

CREATE POLICY "Service role can manage test benchmarks" ON public.test_benchmarks
FOR ALL USING (
  auth.role() = 'service_role'
) WITH CHECK (
  auth.role() = 'service_role'
);

-- 6. weekly_streak_claims - Only system/trainer
DROP POLICY IF EXISTS "System can manage streak claims" ON public.weekly_streak_claims;

CREATE POLICY "System can manage streak claims" ON public.weekly_streak_claims
FOR ALL USING (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = weekly_streak_claims.client_id
    AND c.user_id = auth.uid()
  )
) WITH CHECK (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = weekly_streak_claims.client_id
    AND c.user_id = auth.uid()
  )
);