-- Migrate old plyometric records: move distance_meters to height_cm for height-based jumps
-- These are exercises that should use height_cm but have data in distance_meters

UPDATE exercise_entries ee
SET 
  height_cm = CASE 
    WHEN ee.distance_meters IS NOT NULL AND ee.distance_meters > 0 
         AND ee.distance_meters < 2 -- Reasonable height in meters (< 2m)
    THEN ROUND(ee.distance_meters * 100) -- Convert meters to cm
    ELSE ee.distance_meters -- Already in cm or keep as-is
  END,
  distance_meters = NULL -- Clear distance_meters as it should be height
WHERE ee.exercise_id IN (
  SELECT id FROM exercises 
  WHERE exercise_type_v2 = 'plyometric'
    AND (
      name_cs ILIKE '%výskok%' OR name_cs ILIKE '%CMJ%' OR name_cs ILIKE '%counter%movement%'
      OR name_cs ILIKE '%squat jump%' OR name_cs ILIKE '%drop%jump%' OR name_cs ILIKE '%DJ%'
      OR name ILIKE '%vertical%jump%' OR name ILIKE '%box%jump%'
    )
    AND supported_metrics @> ARRAY['height_cm']
)
AND ee.height_cm IS NULL 
AND ee.distance_meters IS NOT NULL
AND ee.distance_meters > 0;