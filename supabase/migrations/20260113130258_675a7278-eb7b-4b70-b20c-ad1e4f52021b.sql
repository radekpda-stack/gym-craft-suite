-- =====================================================
-- MIGRATION STEP 2: Backfill data
-- =====================================================

-- 1) Backfill metric_key based on existing data
UPDATE public.exercise_entries
SET metric_key = CASE
  WHEN weight_kg IS NOT NULL AND weight_kg > 0 THEN 'weight_kg'
  WHEN height_cm IS NOT NULL AND height_cm > 0 THEN 'height_cm'
  WHEN distance_meters IS NOT NULL AND distance_meters > 0 THEN 'distance_meters'
  WHEN time_seconds IS NOT NULL AND time_seconds > 0 THEN 'time_seconds'
  WHEN avg_watts IS NOT NULL AND avg_watts > 0 THEN 'avg_watts'
  WHEN pace_sec_per_500m IS NOT NULL AND pace_sec_per_500m > 0 THEN 'pace_sec_per_500m'
  WHEN is_bodyweight = true AND reps IS NOT NULL THEN 'bw_reps'
  WHEN reps IS NOT NULL THEN 'reps'
  ELSE 'unknown'
END
WHERE metric_key IS NULL;

-- 2) Backfill side_scope from existing side column
UPDATE public.exercise_entries
SET side_scope = CASE 
  WHEN side IS NULL OR side = '' THEN 'none'
  WHEN side IN ('left', 'L', 'l') THEN 'left'
  WHEN side IN ('right', 'R', 'r') THEN 'right'
  WHEN side IN ('both', 'bilateral') THEN 'both'
  ELSE 'none'
END
WHERE side_scope IS NULL OR side_scope = 'none';

-- 3) Generate pr_scope_key for deterministic PR calculation
UPDATE public.exercise_entries
SET pr_scope_key = CONCAT(
  client_id, ':',
  COALESCE(exercise_id::text, exercise_name), ':',
  COALESCE(metric_key, 'unknown'), ':',
  COALESCE(side_scope, 'none')
)
WHERE pr_scope_key IS NULL;

-- 4) Backfill is_plyometric for exercises based on heuristics
UPDATE public.exercises
SET is_plyometric = true
WHERE is_plyometric = false
AND (
  lower(name) LIKE '%skok%'
  OR lower(name) LIKE '%jump%'
  OR lower(name) LIKE '%cmj%'
  OR lower(name) LIKE '%countermovement%'
  OR lower(name) LIKE '%plyometr%'
  OR lower(name) LIKE '%odraz%'
  OR lower(name) LIKE '%výskok%'
  OR (supported_metrics IS NOT NULL AND 'height_cm' = ANY(supported_metrics))
);

-- 5) Try to backfill exercise_id for legacy records
CREATE OR REPLACE FUNCTION public.temp_match_exercise_v3(p_exercise_name text, p_user_id uuid)
RETURNS uuid AS $$
DECLARE
  matched_id uuid;
BEGIN
  SELECT id INTO matched_id
  FROM public.exercises
  WHERE user_id = p_user_id
    AND (lower(name) = lower(p_exercise_name) OR lower(name_cs) = lower(p_exercise_name))
  LIMIT 1;
  
  IF matched_id IS NOT NULL THEN
    RETURN matched_id;
  END IF;
  
  SELECT e.id INTO matched_id
  FROM public.exercises e
  JOIN public.exercise_aliases ea ON ea.exercise_id = e.id
  WHERE e.user_id = p_user_id
    AND lower(ea.alias_name) = lower(p_exercise_name)
  LIMIT 1;
  
  RETURN matched_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

UPDATE public.exercise_entries ee
SET exercise_id = public.temp_match_exercise_v3(ee.exercise_name, ee.user_id)
WHERE ee.exercise_id IS NULL
  AND public.temp_match_exercise_v3(ee.exercise_name, ee.user_id) IS NOT NULL;

DROP FUNCTION IF EXISTS public.temp_match_exercise_v3(text, uuid);

-- 6) Migrate cardio_entries to exercise_entries
INSERT INTO public.exercise_entries (
  user_id, client_id, exercise_id, exercise_name, date, 
  sets, reps, time_seconds, distance_meters,
  avg_watts, max_watts, avg_speed_kmh, max_speed_kmh,
  avg_heart_rate, max_heart_rate, rpe, leg_fatigue,
  is_test, is_pr, notes, training_session_id,
  metric_key, side_scope, created_at, updated_at
)
SELECT 
  ce.user_id, ce.client_id, ce.exercise_id, ce.exercise_name, ce.date,
  1 as sets, NULL as reps, ce.duration_seconds as time_seconds, ce.distance_meters,
  ce.avg_watts, ce.max_watts, ce.avg_speed_kmh, ce.max_speed_kmh,
  ce.avg_heart_rate, ce.max_heart_rate, ce.rpe, ce.leg_fatigue,
  ce.is_test, ce.is_pr, ce.notes, ce.training_session_id,
  CASE 
    WHEN ce.distance_meters IS NOT NULL THEN 'distance_meters'
    WHEN ce.duration_seconds IS NOT NULL THEN 'time_seconds'
    WHEN ce.avg_watts IS NOT NULL THEN 'avg_watts'
    ELSE 'unknown'
  END as metric_key,
  'none' as side_scope,
  ce.created_at, ce.updated_at
FROM public.cardio_entries ce
WHERE NOT EXISTS (
  SELECT 1 FROM public.exercise_entries ee 
  WHERE ee.user_id = ce.user_id 
    AND ee.client_id = ce.client_id 
    AND ee.date = ce.date 
    AND ee.exercise_name = ce.exercise_name
);

-- 7) Add indexes
CREATE INDEX IF NOT EXISTS idx_exercise_entries_pr_scope_key ON public.exercise_entries(pr_scope_key);
CREATE INDEX IF NOT EXISTS idx_exercise_entries_metric_key ON public.exercise_entries(metric_key);
CREATE INDEX IF NOT EXISTS idx_exercises_is_plyometric ON public.exercises(is_plyometric) WHERE is_plyometric = true;