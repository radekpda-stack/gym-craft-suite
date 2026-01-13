-- Phase 1: Extend exercise_type_v2 check constraint and fix data

-- 1.0 Drop old check constraint and add new one with 'plyometric'
ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_exercise_type_v2_check;
ALTER TABLE exercises ADD CONSTRAINT exercises_exercise_type_v2_check 
  CHECK (exercise_type_v2 = ANY (ARRAY['strength'::text, 'cardio'::text, 'mixed'::text, 'plyometric'::text]));

-- 1.1 Set exercise_type_v2 = 'cardio' for cardio exercises
UPDATE exercises 
SET exercise_type_v2 = 'cardio' 
WHERE category ILIKE '%kardio%' 
   OR category ILIKE '%cardio%' 
   OR is_time_based = true
   OR name ILIKE '%veslo%' 
   OR name ILIKE '%rower%'
   OR name ILIKE '%skierg%'
   OR name ILIKE '%běh%'
   OR name ILIKE '%treadmill%'
   OR name ILIKE '%běžecký pás%'
   OR name ILIKE '%kolo%'
   OR name ILIKE '%bike%'
   OR name ILIKE '%assault%';

-- 1.2 Set exercise_type_v2 = 'plyometric' for plyometric exercises
UPDATE exercises 
SET exercise_type_v2 = 'plyometric' 
WHERE is_plyometric = true 
   OR category ILIKE '%plyometrics%'
   OR category ILIKE '%plyometrie%'
   OR name ILIKE '%cmj%'
   OR name ILIKE '%squat jump%'
   OR name ILIKE '%drop jump%'
   OR name ILIKE '%box jump%'
   OR name ILIKE '%výskok%'
   OR name ILIKE '%skok do dálky%'
   OR name ILIKE '%long jump%'
   OR name ILIKE '%broad jump%';

-- 1.3 Fix supported_metrics for Rower/Veslo
UPDATE exercises 
SET supported_metrics = ARRAY['time_seconds', 'distance_meters', 'avg_watts', 'max_watts', 'pace_sec_per_500m', 'cadence_spm', 'strokes', 'calories_kcal', 'avg_heart_rate', 'max_heart_rate', 'rpe']
WHERE name ILIKE '%veslo%' OR name ILIKE '%rower%' OR name ILIKE '%veslování%';

-- 1.4 Fix supported_metrics for SkiErg
UPDATE exercises 
SET supported_metrics = ARRAY['time_seconds', 'distance_meters', 'avg_watts', 'max_watts', 'pace_sec_per_500m', 'level', 'resistance', 'calories_kcal', 'avg_heart_rate', 'max_heart_rate', 'rpe']
WHERE name ILIKE '%skierg%' OR name ILIKE '%ski erg%';

-- 1.5 Fix supported_metrics for Treadmill/Running
UPDATE exercises 
SET supported_metrics = ARRAY['time_seconds', 'distance_meters', 'avg_speed_kmh', 'max_speed_kmh', 'pace_sec_per_km', 'incline_percent', 'avg_heart_rate', 'max_heart_rate', 'calories_kcal', 'rpe']
WHERE name ILIKE '%běh%' OR name ILIKE '%treadmill%' OR name ILIKE '%běžecký pás%' OR name ILIKE '%running%';

-- 1.6 Fix supported_metrics for Bike/Assault Bike
UPDATE exercises 
SET supported_metrics = ARRAY['time_seconds', 'distance_meters', 'avg_watts', 'max_watts', 'avg_speed_kmh', 'cadence_spm', 'level', 'resistance', 'calories_kcal', 'avg_heart_rate', 'max_heart_rate', 'rpe']
WHERE name ILIKE '%kolo%' OR name ILIKE '%bike%' OR name ILIKE '%assault%' OR name ILIKE '%cykl%';

-- 1.7 Fix supported_metrics for height-based jumps (CMJ, SJ, DJ, Box Jump)
UPDATE exercises 
SET supported_metrics = ARRAY['height_cm', 'reps', 'sets', 'rpe']
WHERE (name ILIKE '%cmj%' 
   OR name ILIKE '%squat jump%' 
   OR name ILIKE '%drop jump%' 
   OR name ILIKE '%box jump%' 
   OR name ILIKE '%výskok%'
   OR name ILIKE '%countermovement%'
   OR name ILIKE '%vertikální skok%')
  AND (is_plyometric = true OR exercise_type_v2 = 'plyometric');

-- 1.8 Fix supported_metrics for distance-based jumps (Long Jump, Broad Jump)
UPDATE exercises 
SET supported_metrics = ARRAY['distance_meters', 'reps', 'sets', 'rpe']
WHERE (name ILIKE '%skok do dálky%' 
   OR name ILIKE '%long jump%' 
   OR name ILIKE '%broad jump%'
   OR name ILIKE '%horizontal jump%')
  AND (is_plyometric = true OR exercise_type_v2 = 'plyometric');

-- 1.9 Backfill metric_key for plyometric entries with height
UPDATE exercise_entries ee
SET metric_key = 'height_cm'
FROM exercises e
WHERE ee.exercise_id = e.id
  AND e.exercise_type_v2 = 'plyometric'
  AND e.supported_metrics @> ARRAY['height_cm']
  AND (ee.metric_key IS NULL OR ee.metric_key = 'unknown');

-- 1.10 Backfill metric_key for plyometric entries with distance
UPDATE exercise_entries ee
SET metric_key = 'distance_meters'
FROM exercises e
WHERE ee.exercise_id = e.id
  AND e.exercise_type_v2 = 'plyometric'
  AND e.supported_metrics @> ARRAY['distance_meters']
  AND NOT (e.supported_metrics @> ARRAY['height_cm'])
  AND (ee.metric_key IS NULL OR ee.metric_key = 'unknown');

-- 1.11 Backfill metric_key for cardio entries
UPDATE exercise_entries ee
SET metric_key = 'time_seconds'
FROM exercises e
WHERE ee.exercise_id = e.id
  AND e.exercise_type_v2 = 'cardio'
  AND ee.time_seconds IS NOT NULL
  AND (ee.metric_key IS NULL OR ee.metric_key = 'unknown');