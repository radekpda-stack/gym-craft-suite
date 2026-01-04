-- Drop and recreate the function with correct table structure
DROP FUNCTION IF EXISTS seed_circuit_templates_for_user(UUID);

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
  INSERT INTO training_templates (user_id, name, description, workout_format, time_cap_seconds)
  VALUES (
    p_user_id,
    'Cindy (AMRAP 20 min)',
    'Klasický CrossFit benchmark. Kolik kol zvládneš za 20 minut?',
    'amrap',
    1200
  ) RETURNING id INTO v_cindy_id;

  INSERT INTO training_template_exercises (template_id, exercise_name, reps_min, sort_order, notes, block_type)
  VALUES 
    (v_cindy_id, 'Pull-ups (strict)', 5, 0, 'Plný rozsah pohybu', 'primary'),
    (v_cindy_id, 'Push-ups', 10, 1, 'Hruď k zemi', 'primary'),
    (v_cindy_id, 'Air Squats', 15, 2, 'Pod paralelu', 'primary');

  -- Fran (For Time 21-15-9)
  INSERT INTO training_templates (user_id, name, description, workout_format, rounds)
  VALUES (
    p_user_id,
    'Fran (For Time)',
    'Legendární CrossFit benchmark. 21-15-9 reps na čas.',
    'for_time',
    3
  ) RETURNING id INTO v_fran_id;

  INSERT INTO training_template_exercises (template_id, exercise_name, reps_min, sort_order, notes, block_type)
  VALUES 
    (v_fran_id, 'Thrusters', 21, 0, '21-15-9 (muži 43kg, ženy 30kg)', 'primary'),
    (v_fran_id, 'Pull-ups', 21, 1, '21-15-9 (kipping povoleno)', 'primary');

  -- EMOM 10 min
  INSERT INTO training_templates (user_id, name, description, workout_format, time_cap_seconds, work_interval_seconds)
  VALUES (
    p_user_id,
    'EMOM 10 min - KB Swings',
    'Každou minutu na minutu: 10 kettlebell swings. Zbytek minuty odpočinek.',
    'emom',
    600,
    60
  ) RETURNING id INTO v_emom_id;

  INSERT INTO training_template_exercises (template_id, exercise_name, reps_min, sort_order, notes, block_type)
  VALUES 
    (v_emom_id, 'Kettlebell Swing', 10, 0, 'Russian swing, muži 24kg, ženy 16kg', 'primary');

  -- Tabata Core
  INSERT INTO training_templates (user_id, name, description, workout_format, rounds, work_interval_seconds, rest_interval_seconds)
  VALUES (
    p_user_id,
    'Tabata Core',
    '8 kol Tabata (20s práce / 10s odpočinek) pro core.',
    'tabata',
    8,
    20,
    10
  ) RETURNING id INTO v_tabata_id;

  INSERT INTO training_template_exercises (template_id, exercise_name, time_seconds, sort_order, notes, block_type)
  VALUES 
    (v_tabata_id, 'Plank Hold', 20, 0, 'Výdrž v planku', 'primary'),
    (v_tabata_id, 'V-ups', NULL, 1, 'Maximální počet za 20s', 'primary'),
    (v_tabata_id, 'Mountain Climbers', NULL, 2, 'Maximální počet za 20s', 'primary'),
    (v_tabata_id, 'Hollow Hold', 20, 3, 'Výdrž v hollow pozici', 'primary');

  -- 5 Round Circuit
  INSERT INTO training_templates (user_id, name, description, workout_format, rounds, rest_interval_seconds)
  VALUES (
    p_user_id,
    '5 Round Circuit - Full Body',
    'Klasický kruhový trénink. 5 kol s 60s odpočinkem mezi koly.',
    'circuit',
    5,
    60
  ) RETURNING id INTO v_circuit_id;

  INSERT INTO training_template_exercises (template_id, exercise_name, reps_min, sort_order, notes, block_type)
  VALUES 
    (v_circuit_id, 'Burpees', 10, 0, 'S výskokem a tlesknutím nad hlavou', 'primary'),
    (v_circuit_id, 'Box Jumps', 15, 1, 'Výška 60/50 cm', 'primary'),
    (v_circuit_id, 'Kettlebell Swings', 20, 2, 'Russian swing', 'primary'),
    (v_circuit_id, 'Rowing', NULL, 3, '200m, Damper 4-6', 'primary');

  -- Return all inserted templates
  RETURN QUERY SELECT * FROM training_templates WHERE id IN (v_cindy_id, v_fran_id, v_emom_id, v_tabata_id, v_circuit_id);
END;
$$;