-- 1. Oprava RLS policy pro profiles - změna z public na authenticated
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- 2. Přidání policy pro adminy aby mohli vidět všechny profily
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3. Oprava funkce auto_add_client_to_leaderboard - přidání search_path
CREATE OR REPLACE FUNCTION public.auto_add_client_to_leaderboard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.is_system = false THEN
    INSERT INTO client_leaderboard_settings (client_id, leaderboard_nickname, leaderboard_visible)
    VALUES (NEW.id, NULL, false)
    ON CONFLICT (client_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;