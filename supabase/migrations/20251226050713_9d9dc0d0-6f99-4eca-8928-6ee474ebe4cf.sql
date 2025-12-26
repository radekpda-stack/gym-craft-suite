-- Fix: Recreate view with SECURITY INVOKER (default, but explicit)
DROP VIEW IF EXISTS public.exercise_body_part_categories;

CREATE VIEW public.exercise_body_part_categories 
WITH (security_invoker = true)
AS
SELECT DISTINCT
  emg.exercise_id,
  bpc.id as body_part_category_id,
  bpc.key as body_part_key,
  bpc.name_cs as body_part_name_cs,
  bpc.name_en as body_part_name_en,
  bpc.display_order
FROM public.exercise_muscle_groups emg
JOIN public.muscle_group_to_body_part mgbp ON mgbp.muscle_group_id = emg.muscle_group_id
JOIN public.body_part_categories bpc ON bpc.id = mgbp.body_part_category_id;