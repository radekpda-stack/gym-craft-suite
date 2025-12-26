-- Backfill: Doplnit time_seconds a distance_meters z workout_entries do exercise_entries
UPDATE exercise_entries ee
SET 
  time_seconds = COALESCE(ee.time_seconds, (
    SELECT MIN(we.time_seconds) 
    FROM workout_entries we 
    WHERE we.training_session_id = ee.training_session_id 
      AND we.exercise_name = ee.exercise_name
      AND we.time_seconds IS NOT NULL
      AND we.time_seconds > 0
  )),
  distance_meters = COALESCE(ee.distance_meters, (
    SELECT MAX(we.distance_meters) 
    FROM workout_entries we 
    WHERE we.training_session_id = ee.training_session_id 
      AND we.exercise_name = ee.exercise_name
      AND we.distance_meters IS NOT NULL
  ))
WHERE ee.training_session_id IS NOT NULL
  AND (ee.time_seconds IS NULL OR ee.distance_meters IS NULL);