-- Add Single-Leg Lateral Bound plyometric exercise
INSERT INTO exercises (
  name,
  name_cs,
  category,
  exercise_type_v2,
  is_plyometric,
  is_bodyweight,
  is_time_based,
  supported_metrics,
  equipment
) VALUES (
  'Single-Leg Lateral Bound',
  'Skok do strany z jedné nohy',
  'plyometrics',
  'plyometric',
  true,
  true,
  false,
  ARRAY['distance_meters', 'reps', 'sets', 'rpe'],
  ARRAY['metr', 'telefon-video']
);