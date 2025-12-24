-- Fáze 2: Automatická synchronizace workout_entries → exercise_entries

-- Funkce pro automatickou synchronizaci při INSERT/UPDATE/DELETE na workout_entries
CREATE OR REPLACE FUNCTION sync_workout_to_exercise_entries()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_training_session training_sessions%ROWTYPE;
  v_best_set RECORD;
  v_total_sets INTEGER;
  v_is_pr BOOLEAN;
  v_previous_best NUMERIC;
BEGIN
  -- Určíme training_session_id podle operace
  IF TG_OP = 'DELETE' THEN
    -- Při DELETE potřebujeme přepočítat pro starou session
    SELECT * INTO v_training_session FROM training_sessions WHERE id = OLD.training_session_id;
  ELSE
    SELECT * INTO v_training_session FROM training_sessions WHERE id = NEW.training_session_id;
  END IF;

  -- Pokud není training session, nic neděláme
  IF v_training_session.id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Určíme exercise_name a exercise_id
  DECLARE
    v_exercise_name TEXT;
    v_exercise_id UUID;
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_exercise_name := OLD.exercise_name;
      v_exercise_id := OLD.exercise_id;
    ELSE
      v_exercise_name := NEW.exercise_name;
      v_exercise_id := NEW.exercise_id;
    END IF;

    -- Smazat existující záznam pro toto cvičení v této session
    DELETE FROM exercise_entries 
    WHERE training_session_id = v_training_session.id
      AND exercise_name = v_exercise_name
      AND user_id = v_training_session.user_id;

    -- Pokud to není DELETE, vytvoříme nový agregovaný záznam
    IF TG_OP != 'DELETE' THEN
      -- Spočítáme celkový počet setů
      SELECT COUNT(*) INTO v_total_sets
      FROM workout_entries
      WHERE training_session_id = v_training_session.id
        AND exercise_name = v_exercise_name;

      -- Pokud existují záznamy, najdeme nejlepší set
      IF v_total_sets > 0 THEN
        -- Najdeme nejlepší set (nejvyšší weight_kg * reps)
        SELECT 
          exercise_id,
          exercise_name,
          weight_kg,
          reps,
          time_seconds,
          notes,
          is_pr
        INTO v_best_set
        FROM workout_entries
        WHERE training_session_id = v_training_session.id
          AND exercise_name = v_exercise_name
        ORDER BY COALESCE(weight_kg, 0) * COALESCE(reps, 0) DESC
        LIMIT 1;

        -- Zjistíme, jestli je to PR
        SELECT MAX(weight_kg) INTO v_previous_best
        FROM exercise_entries
        WHERE client_id = v_training_session.client_id
          AND exercise_name = v_exercise_name
          AND user_id = v_training_session.user_id
          AND training_session_id != v_training_session.id;

        v_is_pr := v_previous_best IS NULL OR COALESCE(v_best_set.weight_kg, 0) > v_previous_best;

        -- Vložíme agregovaný záznam
        INSERT INTO exercise_entries (
          client_id,
          exercise_id,
          exercise_name,
          sets,
          reps,
          weight_kg,
          time_seconds,
          is_pr,
          date,
          user_id,
          notes,
          training_session_id
        ) VALUES (
          v_training_session.client_id,
          v_best_set.exercise_id,
          v_best_set.exercise_name,
          v_total_sets,
          v_best_set.reps,
          v_best_set.weight_kg,
          v_best_set.time_seconds,
          v_is_pr,
          v_training_session.date::date,
          v_training_session.user_id,
          v_best_set.notes,
          v_training_session.id
        );
      END IF;
    END IF;
  END;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Trigger pro automatickou synchronizaci
DROP TRIGGER IF EXISTS trigger_sync_workout_entries ON workout_entries;

CREATE TRIGGER trigger_sync_workout_entries
AFTER INSERT OR UPDATE OR DELETE ON workout_entries
FOR EACH ROW
EXECUTE FUNCTION sync_workout_to_exercise_entries();