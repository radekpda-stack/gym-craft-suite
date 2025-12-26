-- Fix the sync_workout_to_exercise_entries trigger by removing volume column references
CREATE OR REPLACE FUNCTION sync_workout_to_exercise_entries()
RETURNS TRIGGER AS $$
DECLARE
  v_training_date DATE;
  v_client_id UUID;
  v_user_id UUID;
  v_is_time_based BOOLEAN;
  v_best_set RECORD;
  v_current_best RECORD;
  v_is_pr BOOLEAN := FALSE;
  v_existing_entry_id UUID;
BEGIN
  -- Get training session info
  SELECT ts.date, ts.client_id, ts.user_id
  INTO v_training_date, v_client_id, v_user_id
  FROM public.training_sessions ts
  WHERE ts.id = NEW.training_session_id;

  IF v_client_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if it's a time-based exercise
  SELECT COALESCE(e.is_time_based, FALSE)
  INTO v_is_time_based
  FROM public.exercises e
  WHERE e.id = NEW.exercise_id;
  
  IF v_is_time_based IS NULL THEN
    SELECT COALESCE(e.is_time_based, FALSE)
    INTO v_is_time_based
    FROM public.exercises e
    WHERE LOWER(e.name) = LOWER(NEW.exercise_name)
    LIMIT 1;
  END IF;
  
  v_is_time_based := COALESCE(v_is_time_based, FALSE);

  -- Find the best set based on exercise type
  IF v_is_time_based THEN
    SELECT we.weight_kg, we.reps, we.time_seconds, we.distance_meters
    INTO v_best_set
    FROM public.workout_entries we
    WHERE we.training_session_id = NEW.training_session_id
      AND we.exercise_name = NEW.exercise_name
      AND we.time_seconds IS NOT NULL
      AND we.time_seconds > 0
    ORDER BY we.time_seconds ASC
    LIMIT 1;
  ELSE
    SELECT we.weight_kg, we.reps, we.time_seconds, we.distance_meters
    INTO v_best_set
    FROM public.workout_entries we
    WHERE we.training_session_id = NEW.training_session_id
      AND we.exercise_name = NEW.exercise_name
    ORDER BY COALESCE(we.weight_kg, 0) * COALESCE(we.reps, 0) DESC
    LIMIT 1;
  END IF;

  -- Check for PR
  IF v_is_time_based THEN
    SELECT ee.time_seconds
    INTO v_current_best
    FROM public.exercise_entries ee
    WHERE ee.client_id = v_client_id
      AND ee.exercise_name = NEW.exercise_name
      AND ee.time_seconds IS NOT NULL
    ORDER BY ee.time_seconds ASC
    LIMIT 1;
    
    IF v_current_best IS NULL OR v_best_set.time_seconds < v_current_best.time_seconds THEN
      v_is_pr := TRUE;
    END IF;
  ELSE
    SELECT ee.weight_kg
    INTO v_current_best
    FROM public.exercise_entries ee
    WHERE ee.client_id = v_client_id
      AND ee.exercise_name = NEW.exercise_name
      AND ee.weight_kg IS NOT NULL
    ORDER BY ee.weight_kg DESC
    LIMIT 1;
    
    IF v_current_best IS NULL OR COALESCE(v_best_set.weight_kg, 0) > COALESCE(v_current_best.weight_kg, 0) THEN
      v_is_pr := TRUE;
    END IF;
  END IF;

  -- Check for existing entry
  SELECT id INTO v_existing_entry_id
  FROM public.exercise_entries
  WHERE training_session_id = NEW.training_session_id
    AND exercise_name = NEW.exercise_name
  LIMIT 1;

  IF v_existing_entry_id IS NOT NULL THEN
    -- Update existing entry (WITHOUT volume)
    UPDATE public.exercise_entries
    SET 
      weight_kg = v_best_set.weight_kg,
      reps = v_best_set.reps,
      time_seconds = v_best_set.time_seconds,
      distance_meters = v_best_set.distance_meters,
      is_pr = v_is_pr,
      updated_at = NOW()
    WHERE id = v_existing_entry_id;
  ELSE
    -- Insert new entry (WITHOUT volume)
    INSERT INTO public.exercise_entries (
      client_id,
      user_id,
      exercise_id,
      exercise_name,
      date,
      weight_kg,
      reps,
      time_seconds,
      distance_meters,
      is_pr,
      training_session_id,
      sets
    ) VALUES (
      v_client_id,
      v_user_id,
      NEW.exercise_id,
      NEW.exercise_name,
      v_training_date,
      v_best_set.weight_kg,
      v_best_set.reps,
      v_best_set.time_seconds,
      v_best_set.distance_meters,
      v_is_pr,
      NEW.training_session_id,
      1
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;