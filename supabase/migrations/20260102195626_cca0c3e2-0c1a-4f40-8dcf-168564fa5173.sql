-- 1. Update all existing clients to be anonymous by default
UPDATE client_leaderboard_settings 
SET leaderboard_visible = false,
    leaderboard_nickname = NULL;

-- 2. Fix the trigger function for new clients to default to anonymous
CREATE OR REPLACE FUNCTION public.auto_add_client_to_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_system = false THEN
    INSERT INTO client_leaderboard_settings (client_id, leaderboard_nickname, leaderboard_visible)
    VALUES (NEW.id, NULL, false)
    ON CONFLICT (client_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Change the default value for leaderboard_visible column to false
ALTER TABLE client_leaderboard_settings 
ALTER COLUMN leaderboard_visible SET DEFAULT false;