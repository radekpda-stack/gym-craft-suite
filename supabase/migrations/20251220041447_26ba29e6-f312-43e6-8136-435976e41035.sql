-- Create profiles table for user lookup
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Update trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user registration (update existing or create)
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name);
  RETURN NEW;
END;
$$;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Populate existing users into profiles
INSERT INTO public.profiles (id, email, display_name)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on calendar_shares (if not already)
ALTER TABLE public.calendar_shares ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their shares" ON public.calendar_shares;
DROP POLICY IF EXISTS "Users can create shares" ON public.calendar_shares;
DROP POLICY IF EXISTS "Users can update their received shares" ON public.calendar_shares;
DROP POLICY IF EXISTS "Users can delete their shares" ON public.calendar_shares;

-- RLS policies for calendar_shares
CREATE POLICY "Users can view their shares" ON public.calendar_shares
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR shared_with_user_id = auth.uid());

CREATE POLICY "Users can create shares" ON public.calendar_shares
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can update their received shares" ON public.calendar_shares
  FOR UPDATE TO authenticated
  USING (shared_with_user_id = auth.uid() OR owner_user_id = auth.uid());

CREATE POLICY "Users can delete their shares" ON public.calendar_shares
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid() OR shared_with_user_id = auth.uid());