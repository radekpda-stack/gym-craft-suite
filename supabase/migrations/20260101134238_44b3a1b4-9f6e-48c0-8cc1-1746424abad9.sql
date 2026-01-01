-- Create a unified view that combines exercise data from both trainer-entered and client-entered workouts
-- This allows trainers to see complete client progress

CREATE OR REPLACE VIEW public.vw_client_exercise_progress AS
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
  'trainer' as source,
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
  'client' as source,
  cwe.created_at
FROM client_workout_exercises cwe
JOIN client_workout_logs cwl ON cwl.id = cwe.workout_log_id;

-- Grant access to the view
GRANT SELECT ON public.vw_client_exercise_progress TO authenticated;

-- Create a view for cardio progress combining both sources
CREATE OR REPLACE VIEW public.vw_client_cardio_progress AS
-- Trainer-entered cardio entries
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
  'trainer' as source,
  ce.created_at
FROM cardio_entries ce

UNION ALL

-- Client self-logged cardio from workout diary (for cardio-type exercises)
SELECT 
  cwe.id,
  cwl.client_id,
  cwe.exercise_id,
  cwe.exercise_name,
  cwl.date,
  cwe.duration_seconds,
  cwe.distance_meters,
  NULL as avg_heart_rate,
  NULL as max_heart_rate,
  NULL as avg_watts,
  NULL as max_watts,
  cwe.rpe,
  cwe.is_personal_record,
  cwe.notes,
  'client' as source,
  cwe.created_at
FROM client_workout_exercises cwe
JOIN client_workout_logs cwl ON cwl.id = cwe.workout_log_id
WHERE cwl.workout_type = 'cardio' OR cwe.duration_seconds IS NOT NULL;

GRANT SELECT ON public.vw_client_cardio_progress TO authenticated;