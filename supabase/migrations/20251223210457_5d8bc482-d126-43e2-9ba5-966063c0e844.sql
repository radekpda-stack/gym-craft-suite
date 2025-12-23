-- Extend profiles table with account management fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'pending' 
  CHECK (account_status IN ('pending', 'approved', 'rejected', 'suspended')),
ADD COLUMN IF NOT EXISTS subscription_type text NOT NULL DEFAULT 'free'
  CHECK (subscription_type IN ('free', 'trial', 'paid')),
ADD COLUMN IF NOT EXISTS trial_until timestamptz,
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS approved_by uuid,
ADD COLUMN IF NOT EXISTS admin_note text,
ADD COLUMN IF NOT EXISTS first_login_at timestamptz,
ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
ADD COLUMN IF NOT EXISTS client_limit integer NOT NULL DEFAULT 5;

-- Create user_devices table for device tracking
CREATE TABLE IF NOT EXISTS public.user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  device_name text,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_id)
);

-- Enable RLS on user_devices
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_devices
CREATE POLICY "Users can view own devices" ON public.user_devices
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own devices" ON public.user_devices
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own devices" ON public.user_devices
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can delete own devices" ON public.user_devices
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Admins can view all devices
CREATE POLICY "Admins can view all devices" ON public.user_devices
  FOR SELECT TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

-- Create user_approval_log table
CREATE TABLE IF NOT EXISTS public.user_approval_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('approved', 'rejected', 'suspended')),
  performed_by uuid NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on user_approval_log
ALTER TABLE public.user_approval_log ENABLE ROW LEVEL SECURITY;

-- Only admins can access approval log
CREATE POLICY "Admins can view approval log" ON public.user_approval_log
  FOR SELECT TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert approval log" ON public.user_approval_log
  FOR INSERT TO authenticated 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update the handle_new_user_profile function to set default values
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, account_status, subscription_type, client_limit)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'pending',
    'free',
    5
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name);
  RETURN NEW;
END;
$$;

-- Add admin RLS policy for profiles (to manage approvals)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

-- Update existing users to approved status (they were already using the app)
UPDATE public.profiles 
SET account_status = 'approved', 
    approved_at = now(),
    client_limit = 9999
WHERE account_status = 'pending';