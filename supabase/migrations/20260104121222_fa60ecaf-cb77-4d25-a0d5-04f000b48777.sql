-- Drop and recreate with more templates
DROP FUNCTION IF EXISTS seed_circuit_templates_for_user(UUID);

CREATE OR REPLACE FUNCTION seed_circuit_templates_for_user(p_user_id UUID)
RETURNS SETOF training_templates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_ids UUID[] := '{}';
BEGIN
  -- Check if user already has seeded templates
  IF EXISTS (
    SELECT 1 FROM training_templates 
    WHERE user_id = p_user_id AND name = 'Cindy (AMRAP 20 min)'
  ) THEN
    RETURN;
  END IF;

  -- 1. Cindy (AMRAP 20 min)
  INSERT INTO training_templates (user_id, name, description, workout_format, time_cap_seconds)
  VALUES (p_user_id, 'Cindy (AMRAP 20 min)', 'Klasický CrossFit benchmark. Kolik kol zvládneš za 20 minut?', 'amrap', 1200)
  RETURNING id INTO v_id;
  v_ids := array_append(v_ids, v_id);
  INSERT INTO training_template_exercises (template_id, exercise_name, reps_min, sort_order, notes, block_type) VALUES 
    (v_id, 'Pull-ups (strict)', 5, 0, 'Plný rozsah pohybu', 'primary'),
    (v_id, 'Push-ups', 10, 1, 'Hruď k zemi', 'primary'),
    (v_id, 'Air Squats', 15, 2, 'Pod paralelu', 'primary');

  -- 2. Fran (For Time)
  INSERT INTO training_templates (user_id, name, description, workout_format, rounds)
  VALUES (p_user_id, 'Fran (For Time)', 'Legendární CrossFit benchmark. 21-15-9 reps na čas.', 'for_time', 3)
  RETURNING id INTO v_id;
  v_ids := array_append(v_ids, v_id);
  INSERT INTO training_template_exercises (template_id, exercise_name, reps_min, sort_order, notes, block_type) VALUES 
    (v_id, 'Thrusters', 21, 0, '21-15-9 (muži 43kg, ženy 30kg)', 'primary'),
    (v_id, 'Pull-ups', 21, 1, '21-15-9 (kipping povoleno)', 'primary');

  -- 3. EMOM 10 min - KB Swings
  INSERT INTO training_templates (user_id, name, description, workout_format, time_cap_seconds, work_interval_seconds)
  VALUES (p_user_id, 'EMOM 10 min - KB Swings', 'Každou minutu na minutu: 10 kettlebell swings.', 'emom', 600, 60)
  RETURNING id INTO v_id;
  v_ids := array_append(v_ids, v_id);
  INSERT INTO training_template_exercises (template_id, exercise_name, reps_min, sort_order, notes, block_type) VALUES 
    (v_id, 'Kettlebell Swing', 10, 0, 'Russian swing, muži 24kg, ženy 16kg', 'primary');

  -- 4. Tabata Core
  INSERT INTO training_templates (user_id, name, description, workout_format, rounds, work_interval_seconds, rest_interval_seconds)
  VALUES (p_user_id, 'Tabata Core', '8 kol Tabata (20s práce / 10s odpočinek) pro core.', 'tabata', 8, 20, 10)
  RETURNING id INTO v_id;
  v_ids := array_append(v_ids, v_id);
  INSERT INTO training_template_exercises (template_id, exercise_name, time_seconds, sort_order, notes, block_type) VALUES 
    (v_id, 'Plank Hold', 20, 0, 'Výdrž v planku', 'primary'),
    (v_id, 'V-ups', NULL, 1, 'Max opakování za 20s', 'primary'),
    (v_id, 'Mountain Climbers', NULL, 2, 'Max opakování za 20s', 'primary'),
    (v_id, 'Hollow Hold', 20, 3, 'Výdrž v hollow pozici', 'primary');

  -- 5. Circuit Full Body
  INSERT INTO training_templates (user_id, name, description, workout_format, rounds, rest_interval_seconds)
  VALUES (p_user_id, '5 Round Circuit - Full Body', 'Klasický kruhový trénink. 5 kol s 60s odpočinkem.', 'circuit', 5, 60)
  RETURNING id INTO v_id;
  v_ids := array_append(v_ids, v_id);
  INSERT INTO training_template_exercises (template_id, exercise_name, reps_min, sort_order, notes, block_type) VALUES 
    (v_id, 'Burpees', 10, 0, 'S výskokem a tlesknutím nad hlavou', 'primary'),
    (v_id, 'Box Jumps', 15, 1, 'Výška 60/50 cm', 'primary'),
    (v_id, 'Kettlebell Swings', 20, 2, 'Russian swing 24/16kg', 'primary'),
    (v_id, 'Rowing', NULL, 3, '200m, Damper 4-6', 'primary');

  -- 6. Helen (For Time)
  INSERT INTO training_templates (user_id, name, description, workout_format, rounds)
  VALUES (p_user_id, 'Helen (For Time)', '3 kola na čas. Klasický CrossFit benchmark kombinující běh a sílu.', 'for_time', 3)
  RETURNING id INTO v_id;
  v_ids := array_append(v_ids, v_id);
  INSERT INTO training_template_exercises (template_id, exercise_name, reps_min, sort_order, notes, block_type) VALUES 
    (v_id, 'Run', NULL, 0, '400m běh', 'primary'),
    (v_id, 'Kettlebell Swings', 21, 1, 'American swing 24/16kg', 'primary'),
    (v_id, 'Pull-ups', 12, 2, 'Kipping povoleno', 'primary');

  -- 7. Annie (For Time 50-40-30-20-10)
  INSERT INTO training_templates (user_id, name, description, workout_format, rounds)
  VALUES (p_user_id, 'Annie (For Time)', '50-40-30-20-10 reps na čas. Rychlý a intenzivní benchmark.', 'for_time', 5)
  RETURNING id INTO v_id;
  v_ids := array_append(v_ids, v_id);
  INSERT INTO training_template_exercises (template_id, exercise_name, reps_min, sort_order, notes, block_type) VALUES 
    (v_id, 'Double Unders', 50, 0, '50-40-30-20-10 (nebo 3x single unders)', 'primary'),
    (v_id, 'Sit-ups', 50, 1, '50-40-30-20-10 (Abmat)', 'primary');

  -- 8. Mary (AMRAP 20)
  INSERT INTO training_templates (user_id, name, description, workout_format, time_cap_seconds)
  VALUES (p_user_id, 'Mary (AMRAP 20 min)', 'Gymnastický benchmark. Kolik kol za 20 minut?', 'amrap', 1200)
  RETURNING id INTO v_id;
  v_ids := array_append(v_ids, v_id);
  INSERT INTO training_template_exercises (template_id, exercise_name, reps_min, sort_order, notes, block_type) VALUES 
    (v_id, 'Handstand Push-ups', 5, 0, 'Strict nebo kipping', 'primary'),
    (v_id, 'Pistols', 10, 1, '10 celkem (5+5)', 'primary'),
    (v_id, 'Pull-ups', 15, 2, 'Strict nebo kipping', 'primary');

  -- 9. Chelsea (EMOM 30)
  INSERT INTO training_templates (user_id, name, description, workout_format, time_cap_seconds, work_interval_seconds)
  VALUES (p_user_id, 'Chelsea (EMOM 30 min)', 'Každou minutu na minutu po dobu 30 minut.', 'emom', 1800, 60)
  RETURNING id INTO v_id;
  v_ids := array_append(v_ids, v_id);
  INSERT INTO training_template_exercises (template_id, exercise_name, reps_min, sort_order, notes, block_type) VALUES 
    (v_id, 'Pull-ups', 5, 0, 'Strict nebo kipping', 'primary'),
    (v_id, 'Push-ups', 10, 1, 'Plný rozsah', 'primary'),
    (v_id, 'Air Squats', 15, 2, 'Pod paralelu', 'primary');

  -- 10. Death by Burpees (EMOM)
  INSERT INTO training_templates (user_id, name, description, workout_format, time_cap_seconds, work_interval_seconds)
  VALUES (p_user_id, 'Death by Burpees', 'EMOM: 1. min = 1 burpee, 2. min = 2 burpees... Dokud stíháš.', 'emom', 1200, 60)
  RETURNING id INTO v_id;
  v_ids := array_append(v_ids, v_id);
  INSERT INTO training_template_exercises (template_id, exercise_name, reps_min, sort_order, notes, block_type) VALUES 
    (v_id, 'Burpees', 1, 0, 'Přidávej 1 rep každou minutu', 'primary');

  -- 11. Tabata Cardio
  INSERT INTO training_templates (user_id, name, description, workout_format, rounds, work_interval_seconds, rest_interval_seconds)
  VALUES (p_user_id, 'Tabata Cardio Mix', '8 kol Tabata s různými kardio cviky. Rotuj cviky.', 'tabata', 8, 20, 10)
  RETURNING id INTO v_id;
  v_ids := array_append(v_ids, v_id);
  INSERT INTO training_template_exercises (template_id, exercise_name, sort_order, notes, block_type) VALUES 
    (v_id, 'Jumping Jacks', 0, 'Max tempo', 'primary'),
    (v_id, 'High Knees', 1, 'Kolena vysoko', 'primary'),
    (v_id, 'Burpees', 2, 'Bez push-upu', 'primary'),
    (v_id, 'Mountain Climbers', 3, 'Rychle', 'primary');

  -- 12. AMRAP 12 - Beginner
  INSERT INTO training_templates (user_id, name, description, workout_format, time_cap_seconds)
  VALUES (p_user_id, 'AMRAP 12 min - Začátečník', 'Jednoduchý AMRAP pro začátečníky bez nářadí.', 'amrap', 720)
  RETURNING id INTO v_id;
  v_ids := array_append(v_ids, v_id);
  INSERT INTO training_template_exercises (template_id, exercise_name, reps_min, sort_order, notes, block_type) VALUES 
    (v_id, 'Air Squats', 10, 0, 'Pod paralelu', 'primary'),
    (v_id, 'Push-ups', 8, 1, 'Případně na kolenou', 'primary'),
    (v_id, 'Sit-ups', 6, 2, 'Kontrolovaný pohyb', 'primary'),
    (v_id, 'Jumping Lunges', 4, 3, '4 na každou nohu', 'primary');

  -- 13. 21-15-9 Dumbbells
  INSERT INTO training_templates (user_id, name, description, workout_format, rounds)
  VALUES (p_user_id, '21-15-9 Dumbbell Complex', 'Klasický formát 21-15-9 s jednoručkami.', 'for_time', 3)
  RETURNING id INTO v_id;
  v_ids := array_append(v_ids, v_id);
  INSERT INTO training_template_exercises (template_id, exercise_name, reps_min, sort_order, notes, block_type) VALUES 
    (v_id, 'Dumbbell Thrusters', 21, 0, '21-15-9 (2x 15/10kg)', 'primary'),
    (v_id, 'Dumbbell Rows', 21, 1, '21-15-9 (každá ruka)', 'primary'),
    (v_id, 'Dumbbell Snatches', 21, 2, '21-15-9 (střídej ruce)', 'primary');

  -- 14. Rowing Intervals (EMOM)
  INSERT INTO training_templates (user_id, name, description, workout_format, time_cap_seconds, work_interval_seconds)
  VALUES (p_user_id, 'EMOM 16 min - Row + Burpees', 'Střídej veslování a burpees každou minutu.', 'emom', 960, 60)
  RETURNING id INTO v_id;
  v_ids := array_append(v_ids, v_id);
  INSERT INTO training_template_exercises (template_id, exercise_name, sort_order, notes, block_type) VALUES 
    (v_id, 'Rowing', 0, 'Liché minuty: 15 kalorií', 'primary'),
    (v_id, 'Burpees', 1, 'Sudé minuty: 10 burpees', 'primary');

  -- 15. Bodyweight Circuit
  INSERT INTO training_templates (user_id, name, description, workout_format, rounds, rest_interval_seconds)
  VALUES (p_user_id, '4 Round Bodyweight Circuit', 'Kruhový trénink bez vybavení. 4 kola, 45s odpočinek.', 'circuit', 4, 45)
  RETURNING id INTO v_id;
  v_ids := array_append(v_ids, v_id);
  INSERT INTO training_template_exercises (template_id, exercise_name, reps_min, sort_order, notes, block_type) VALUES 
    (v_id, 'Push-ups', 15, 0, 'Plný rozsah', 'primary'),
    (v_id, 'Air Squats', 20, 1, 'Pod paralelu', 'primary'),
    (v_id, 'Plank', NULL, 2, '30s výdrž', 'primary'),
    (v_id, 'Jumping Jacks', 30, 3, 'Rychle', 'primary'),
    (v_id, 'Lunges', 10, 4, '10 na každou nohu', 'primary');

  RETURN QUERY SELECT * FROM training_templates WHERE id = ANY(v_ids);
END;
$$;