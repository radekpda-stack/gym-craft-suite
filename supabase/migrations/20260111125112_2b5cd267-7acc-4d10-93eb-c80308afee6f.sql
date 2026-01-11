-- Fix RLS policies that allow public (unauthenticated) access to sensitive data
-- All these policies should require authentication

-- ============ PROFILES TABLE ============
-- Profiles are already correctly configured for authenticated users only

-- ============ MEASUREMENTS TABLE ============
-- Drop policies with public role and recreate with authenticated role

DROP POLICY IF EXISTS "Users can create their own measurements" ON public.measurements;
DROP POLICY IF EXISTS "Users can delete their own measurements" ON public.measurements;
DROP POLICY IF EXISTS "Users can update their own measurements" ON public.measurements;
DROP POLICY IF EXISTS "Users can view their own measurements" ON public.measurements;

CREATE POLICY "Users can create their own measurements" ON public.measurements
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own measurements" ON public.measurements
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own measurements" ON public.measurements
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own measurements" ON public.measurements
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- ============ CREDIT_TRANSACTIONS TABLE ============
-- Drop policies with public role and recreate with authenticated role

DROP POLICY IF EXISTS "Users can create their own credit_transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Users can delete their own credit_transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Users can update their own credit_transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Users can view their own credit_transactions" ON public.credit_transactions;

CREATE POLICY "Users can create their own credit_transactions" ON public.credit_transactions
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit_transactions" ON public.credit_transactions
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit_transactions" ON public.credit_transactions
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own credit_transactions" ON public.credit_transactions
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- ============ TRAINING_SESSIONS TABLE ============
-- Drop policies with public role and recreate with authenticated role

DROP POLICY IF EXISTS "Users can create their own training_sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Users can delete their own training_sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Users can update their own training_sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Users can view their own training_sessions" ON public.training_sessions;

CREATE POLICY "Users can create their own training_sessions" ON public.training_sessions
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own training_sessions" ON public.training_sessions
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own training_sessions" ON public.training_sessions
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own training_sessions" ON public.training_sessions
FOR SELECT TO authenticated
USING (auth.uid() = user_id);