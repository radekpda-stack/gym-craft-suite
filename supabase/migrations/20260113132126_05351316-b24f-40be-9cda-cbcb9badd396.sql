
-- Fix: distance_cm should be distance_meters (these are distance-based jumps, not height)
UPDATE exercises 
SET supported_metrics = ARRAY['distance_meters', 'reps', 'sets', 'rpe']
WHERE name IN ('Single Leg Jump', 'Single-leg Hop for Distance');

-- Fix: Švihadlo - jump rope cardio
UPDATE exercises 
SET supported_metrics = ARRAY['time_seconds', 'reps', 'calories_kcal', 'rpe']
WHERE name = 'Švihadlo';

-- Fix: SkillUp - cardio machine similar to skierg
UPDATE exercises 
SET supported_metrics = ARRAY['time_seconds', 'distance_meters', 'avg_watts', 'max_watts', 'level', 'resistance', 'calories_kcal', 'rpe']
WHERE name = 'SkillUp';
