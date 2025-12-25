-- =====================================================
-- CLIENT PORTAL - DATABASE SCHEMA
-- =====================================================

-- 1. Create enum for client portal roles
CREATE TYPE public.client_role AS ENUM ('client');

-- 2. Create client_accounts table (links auth.users to clients)
CREATE TABLE public.client_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL, -- The trainer who owns this client
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_portal_login TIMESTAMP WITH TIME ZONE,
  portal_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id), -- One auth user = one client account
  UNIQUE(client_id) -- One client = one account
);

-- 3. Create client_access_tokens table (for token URL access)
CREATE TABLE public.client_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  purpose TEXT NOT NULL DEFAULT 'portal_access', -- 'portal_access', 'nutrition', etc.
  expires_at TIMESTAMP WITH TIME ZONE,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Create client_tracked_exercises table (exercises trainer wants to track for progress)
CREATE TABLE public.client_tracked_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL, -- Denormalized for display
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  trainer_id UUID NOT NULL,
  UNIQUE(client_id, exercise_id)
);

-- 5. Create client_portal_activity table (streak tracking)
CREATE TABLE public.client_portal_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  activity_type TEXT NOT NULL, -- 'portal_login', 'nutrition_log', 'training_attended'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, activity_date, activity_type)
);

-- 6. Add indexes for performance
CREATE INDEX idx_client_accounts_user_id ON public.client_accounts(user_id);
CREATE INDEX idx_client_accounts_client_id ON public.client_accounts(client_id);
CREATE INDEX idx_client_accounts_trainer_id ON public.client_accounts(trainer_id);
CREATE INDEX idx_client_access_tokens_token ON public.client_access_tokens(token);
CREATE INDEX idx_client_access_tokens_client_id ON public.client_access_tokens(client_id);
CREATE INDEX idx_client_tracked_exercises_client_id ON public.client_tracked_exercises(client_id);
CREATE INDEX idx_client_portal_activity_client_id ON public.client_portal_activity(client_id);
CREATE INDEX idx_client_portal_activity_date ON public.client_portal_activity(activity_date);

-- 7. Enable RLS
ALTER TABLE public.client_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_tracked_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portal_activity ENABLE ROW LEVEL SECURITY;

-- 8. Security definer function to check if user is a client
CREATE OR REPLACE FUNCTION public.is_client_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_accounts
    WHERE user_id = _user_id AND is_active = true
  )
$$;

-- 9. Security definer function to get client_id for a user
CREATE OR REPLACE FUNCTION public.get_client_id_for_user(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM public.client_accounts
  WHERE user_id = _user_id AND is_active = true
  LIMIT 1
$$;

-- 10. Security definer function to validate access token
CREATE OR REPLACE FUNCTION public.validate_client_token(_token UUID)
RETURNS TABLE(client_id UUID, trainer_id UUID, purpose TEXT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id, trainer_id, purpose
  FROM public.client_access_tokens
  WHERE token = _token 
    AND is_revoked = false 
    AND (expires_at IS NULL OR expires_at > now())
$$;

-- =====================================================
-- RLS POLICIES - CLIENT ACCOUNTS
-- =====================================================

-- Trainers can manage their clients' accounts
CREATE POLICY "Trainers can view their clients accounts"
ON public.client_accounts FOR SELECT
TO authenticated
USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can create client accounts"
ON public.client_accounts FOR INSERT
TO authenticated
WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can update their clients accounts"
ON public.client_accounts FOR UPDATE
TO authenticated
USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can delete their clients accounts"
ON public.client_accounts FOR DELETE
TO authenticated
USING (trainer_id = auth.uid());

-- Clients can view their own account
CREATE POLICY "Clients can view own account"
ON public.client_accounts FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- =====================================================
-- RLS POLICIES - ACCESS TOKENS
-- =====================================================

CREATE POLICY "Trainers can manage their tokens"
ON public.client_access_tokens FOR ALL
TO authenticated
USING (trainer_id = auth.uid());

-- =====================================================
-- RLS POLICIES - TRACKED EXERCISES
-- =====================================================

CREATE POLICY "Trainers can manage tracked exercises"
ON public.client_tracked_exercises FOR ALL
TO authenticated
USING (trainer_id = auth.uid());

-- Clients can view their tracked exercises
CREATE POLICY "Clients can view own tracked exercises"
ON public.client_tracked_exercises FOR SELECT
TO authenticated
USING (client_id = public.get_client_id_for_user(auth.uid()));

-- =====================================================
-- RLS POLICIES - PORTAL ACTIVITY
-- =====================================================

CREATE POLICY "Trainers can view client activity"
ON public.client_portal_activity FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM public.clients WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Clients can view and create own activity"
ON public.client_portal_activity FOR ALL
TO authenticated
USING (client_id = public.get_client_id_for_user(auth.uid()));

-- =====================================================
-- RLS POLICIES FOR EXISTING TABLES (CLIENT ACCESS)
-- =====================================================

-- Clients can view their own data in clients table
CREATE POLICY "Clients can view own client data"
ON public.clients FOR SELECT
TO authenticated
USING (id = public.get_client_id_for_user(auth.uid()));

-- Clients can view their own training sessions
CREATE POLICY "Clients can view own training sessions"
ON public.training_sessions FOR SELECT
TO authenticated
USING (client_id = public.get_client_id_for_user(auth.uid()));

-- Clients can view their own exercise entries
CREATE POLICY "Clients can view own exercise entries"
ON public.exercise_entries FOR SELECT
TO authenticated
USING (client_id = public.get_client_id_for_user(auth.uid()));

-- Clients can view their own credit transactions
CREATE POLICY "Clients can view own credit transactions"
ON public.credit_transactions FOR SELECT
TO authenticated
USING (client_id = public.get_client_id_for_user(auth.uid()));

-- Clients can view their own nutrition sessions
CREATE POLICY "Clients can view own nutrition sessions"
ON public.nutrition_log_sessions FOR SELECT
TO authenticated
USING (client_id = public.get_client_id_for_user(auth.uid()));

-- Clients can manage their own nutrition food entries
CREATE POLICY "Clients can view own food entries"
ON public.nutrition_food_entries FOR SELECT
TO authenticated
USING (client_id = public.get_client_id_for_user(auth.uid()));

CREATE POLICY "Clients can create own food entries"
ON public.nutrition_food_entries FOR INSERT
TO authenticated
WITH CHECK (client_id = public.get_client_id_for_user(auth.uid()));

CREATE POLICY "Clients can update own food entries"
ON public.nutrition_food_entries FOR UPDATE
TO authenticated
USING (client_id = public.get_client_id_for_user(auth.uid()));

-- Clients can manage their own nutrition drink entries
CREATE POLICY "Clients can view own drink entries"
ON public.nutrition_drink_entries FOR SELECT
TO authenticated
USING (client_id = public.get_client_id_for_user(auth.uid()));

CREATE POLICY "Clients can create own drink entries"
ON public.nutrition_drink_entries FOR INSERT
TO authenticated
WITH CHECK (client_id = public.get_client_id_for_user(auth.uid()));

CREATE POLICY "Clients can update own drink entries"
ON public.nutrition_drink_entries FOR UPDATE
TO authenticated
USING (client_id = public.get_client_id_for_user(auth.uid()));

-- Clients can manage their own nutrition coffee entries
CREATE POLICY "Clients can view own coffee entries"
ON public.nutrition_coffee_entries FOR SELECT
TO authenticated
USING (client_id = public.get_client_id_for_user(auth.uid()));

CREATE POLICY "Clients can create own coffee entries"
ON public.nutrition_coffee_entries FOR INSERT
TO authenticated
WITH CHECK (client_id = public.get_client_id_for_user(auth.uid()));

CREATE POLICY "Clients can update own coffee entries"
ON public.nutrition_coffee_entries FOR UPDATE
TO authenticated
USING (client_id = public.get_client_id_for_user(auth.uid()));

-- Clients can view their own measurements
CREATE POLICY "Clients can view own measurements"
ON public.measurements FOR SELECT
TO authenticated
USING (client_id = public.get_client_id_for_user(auth.uid()));

-- Clients can view their own packages
CREATE POLICY "Clients can view own packages"
ON public.client_packages FOR SELECT
TO authenticated
USING (client_id = public.get_client_id_for_user(auth.uid()));

-- =====================================================
-- UPDATE TRIGGER FOR client_accounts
-- =====================================================

CREATE TRIGGER update_client_accounts_updated_at
BEFORE UPDATE ON public.client_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();