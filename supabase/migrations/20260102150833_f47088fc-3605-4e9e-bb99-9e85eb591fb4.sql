
-- Fix search_path for all newly created functions
ALTER FUNCTION public.auto_add_client_to_leaderboard() SET search_path = public;
ALTER FUNCTION public.award_xp_for_exercise_entry() SET search_path = public;
ALTER FUNCTION public.award_xp_for_cardio_entry() SET search_path = public;
ALTER FUNCTION public.award_xp_for_skill_entry() SET search_path = public;
ALTER FUNCTION public.award_xp_for_training_session() SET search_path = public;
