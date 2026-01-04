-- Change default value for leaderboard_visible to true
ALTER TABLE public.client_leaderboard_settings 
ALTER COLUMN leaderboard_visible SET DEFAULT true;