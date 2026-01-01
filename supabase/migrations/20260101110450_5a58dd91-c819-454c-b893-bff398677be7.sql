-- Fix function_search_path warning for sync_workout_to_exercise_entries
ALTER FUNCTION public.sync_workout_to_exercise_entries() SET search_path = public;