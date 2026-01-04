-- Add training_template_id to challenges
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS training_template_id UUID 
  REFERENCES training_templates(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_challenges_training_template_id 
  ON challenges(training_template_id);

-- Insert sample circuit training templates (will be owned by a system user or first user)
-- We'll use a function to insert these for the current user when they first access templates

-- Create a function to seed circuit templates for a user
CREATE OR REPLACE FUNCTION seed_circuit_templates_for_user(p_user_id UUID)
RETURNS SETOF training_templates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cindy_id UUID;
  v_fran_id UUID;
  v_emom_id UUID;
  v_tabata_id UUID;
  v_circuit_id UUID;
BEGIN
  -- Check if user already has seeded templates (check for Cindy)
  IF EXISTS (
    SELECT 1 FROM training_templates 
    WHERE user_id = p_user_id AND name = 'Cindy (AMRAP 20 min)'
  ) THEN
    RETURN;
  END IF;

  -- Cindy (AMRAP 20 min)
  INSERT INTO training_templates (user_id, name, description, workout_format, time_cap_seconds, exercises)
  VALUES (
    p_user_id,
    'Cindy (AMRAP 20 min)',
    'Klasický CrossFit benchmark. Kolik kol zvládneš za 20 minut?',
    'amrap',
    1200,
    '[
      {"exercise_name": "Pull-ups (strict)", "reps": 5, "notes": "Plný rozsah pohybu"},
      {"exercise_name": "Push-ups", "reps": 10, "notes": "Hruď k zemi"},
      {"exercise_name": "Air Squats", "reps": 15, "notes": "Pod paralelu"}
    ]'::jsonb
  ) RETURNING id INTO v_cindy_id;

  -- Fran (For Time 21-15-9)
  INSERT INTO training_templates (user_id, name, description, workout_format, rounds, exercises)
  VALUES (
    p_user_id,
    'Fran (For Time)',
    'Legendární CrossFit benchmark. 21-15-9 reps na čas.',
    'for_time',
    3,
    '[
      {"exercise_name": "Thrusters", "reps": 21, "weight_kg": 43, "notes": "21-15-9 (muži 43kg, ženy 30kg)"},
      {"exercise_name": "Pull-ups", "reps": 21, "notes": "21-15-9 (kipping povoleno)"}
    ]'::jsonb
  ) RETURNING id INTO v_fran_id;

  -- EMOM 10 min
  INSERT INTO training_templates (user_id, name, description, workout_format, time_cap_seconds, work_interval_seconds, exercises)
  VALUES (
    p_user_id,
    'EMOM 10 min - KB Swings',
    'Každou minutu na minutu: 10 kettlebell swings. Zbytek minuty odpočinek.',
    'emom',
    600,
    60,
    '[
      {"exercise_name": "Kettlebell Swing", "reps": 10, "weight_kg": 24, "notes": "Russian swing, muži 24kg, ženy 16kg"}
    ]'::jsonb
  ) RETURNING id INTO v_emom_id;

  -- Tabata Core
  INSERT INTO training_templates (user_id, name, description, workout_format, rounds, work_interval_seconds, rest_interval_seconds, exercises)
  VALUES (
    p_user_id,
    'Tabata Core',
    '8 kol Tabata (20s práce / 10s odpočinek) pro core.',
    'tabata',
    8,
    20,
    10,
    '[
      {"exercise_name": "Plank Hold", "time_seconds": 20, "notes": "Výdrž v planku"},
      {"exercise_name": "V-ups", "reps": null, "notes": "Maximální počet za 20s"},
      {"exercise_name": "Mountain Climbers", "reps": null, "notes": "Maximální počet za 20s"},
      {"exercise_name": "Hollow Hold", "time_seconds": 20, "notes": "Výdrž v hollow pozici"}
    ]'::jsonb
  ) RETURNING id INTO v_tabata_id;

  -- 5 Round Circuit
  INSERT INTO training_templates (user_id, name, description, workout_format, rounds, rest_interval_seconds, exercises)
  VALUES (
    p_user_id,
    '5 Round Circuit - Full Body',
    'Klasický kruhový trénink. 5 kol s 60s odpočinkem mezi koly.',
    'circuit',
    5,
    60,
    '[
      {"exercise_name": "Burpees", "reps": 10, "notes": "S výskokem a tlesknutím nad hlavou"},
      {"exercise_name": "Box Jumps", "reps": 15, "notes": "Výška 60/50 cm"},
      {"exercise_name": "Kettlebell Swings", "reps": 20, "weight_kg": 24, "notes": "Russian swing"},
      {"exercise_name": "Rowing", "distance_meters": 200, "notes": "Damper 4-6"}
    ]'::jsonb
  ) RETURNING id INTO v_circuit_id;

  -- Return all inserted templates
  RETURN QUERY SELECT * FROM training_templates WHERE id IN (v_cindy_id, v_fran_id, v_emom_id, v_tabata_id, v_circuit_id);
END;
$$;