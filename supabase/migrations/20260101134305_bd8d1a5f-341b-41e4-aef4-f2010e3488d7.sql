-- Fix SECURITY DEFINER views by explicitly setting SECURITY INVOKER
-- This ensures RLS policies are applied based on the querying user

DROP VIEW IF EXISTS public.vw_client_exercise_progress;
DROP VIEW IF EXISTS public.vw_client_cardio_progress;

-- Recreate with SECURITY INVOKER
CREATE VIEW public.vw_client_exercise_progress 
WITH (security_invoker = true)
AS
-- Trainer-entered exercise entries
SELECT 
  ee.id,
  ee.client_id,
  ee.exercise_id,
  ee.exercise_name,
  ee.date,
  ee.sets,
  ee.reps,
  ee.weight_kg,
  ee.time_seconds as duration_seconds,
  ee.is_pr as is_personal_record,
  ee.notes,
  'trainer'::text as source,
  ee.created_at
FROM exercise_entries ee

UNION ALL

-- Client self-logged exercises from workout diary
SELECT 
  cwe.id,
  cwl.client_id,
  cwe.exercise_id,
  cwe.exercise_name,
  cwl.date,
  cwe.sets,
  cwe.reps,
  cwe.weight_kg,
  cwe.duration_seconds,
  cwe.is_personal_record,
  cwe.notes,
  'client'::text as source,
  cwe.created_at
FROM client_workout_exercises cwe
JOIN client_workout_logs cwl ON cwl.id = cwe.workout_log_id;

GRANT SELECT ON public.vw_client_exercise_progress TO authenticated;

-- Recreate cardio view with SECURITY INVOKER
CREATE VIEW public.vw_client_cardio_progress 
WITH (security_invoker = true)
AS
SELECT 
  ce.id,
  ce.client_id,
  ce.exercise_id,
  ce.exercise_name,
  ce.date,
  ce.duration_seconds,
  ce.distance_meters,
  ce.avg_heart_rate,
  ce.max_heart_rate,
  ce.avg_watts,
  ce.max_watts,
  ce.rpe,
  ce.is_pr as is_personal_record,
  ce.notes,
  'trainer'::text as source,
  ce.created_at
FROM cardio_entries ce

UNION ALL

SELECT 
  cwe.id,
  cwl.client_id,
  cwe.exercise_id,
  cwe.exercise_name,
  cwl.date,
  cwe.duration_seconds,
  cwe.distance_meters,
  NULL::integer as avg_heart_rate,
  NULL::integer as max_heart_rate,
  NULL::integer as avg_watts,
  NULL::integer as max_watts,
  cwe.rpe,
  cwe.is_personal_record,
  cwe.notes,
  'client'::text as source,
  cwe.created_at
FROM client_workout_exercises cwe
JOIN client_workout_logs cwl ON cwl.id = cwe.workout_log_id
WHERE cwl.workout_type = 'cardio' OR cwe.duration_seconds IS NOT NULL;

GRANT SELECT ON public.vw_client_cardio_progress TO authenticated;