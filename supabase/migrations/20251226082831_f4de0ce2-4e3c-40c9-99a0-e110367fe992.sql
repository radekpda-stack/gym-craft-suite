-- Function to auto-submit training results to matching active challenges
CREATE OR REPLACE FUNCTION public.auto_submit_challenge_from_cardio()
RETURNS TRIGGER AS $$
DECLARE
  v_challenge RECORD;
  v_trainer_id UUID;
  v_existing_better BOOLEAN;
BEGIN
  -- Get the trainer_id for this client
  SELECT user_id INTO v_trainer_id
  FROM clients
  WHERE id = NEW.client_id;

  -- Find matching active challenges
  -- For cardio entries, we look for challenges that match the exercise type and are time-based
  FOR v_challenge IN 
    SELECT c.* 
    FROM challenges c
    WHERE c.status = 'published'
      AND c.created_by_user_id = v_trainer_id
      AND NOW() BETWEEN c.start_at AND c.end_at
      AND c.primary_metric = 'time_seconds'
      -- Match challenge title with exercise name (case-insensitive partial match)
      AND (
        -- Row 500m matches veslo/row with 500m distance
        (LOWER(c.title) LIKE '%500%' AND LOWER(c.title) LIKE '%row%' AND NEW.distance_meters = 500 AND LOWER(NEW.exercise_name) LIKE '%vesl%')
        OR (LOWER(c.title) LIKE '%500%' AND LOWER(c.title) LIKE '%veslo%' AND NEW.distance_meters = 500 AND LOWER(NEW.exercise_name) LIKE '%vesl%')
        OR (LOWER(c.title) LIKE '%500%' AND LOWER(c.title) LIKE '%row%' AND NEW.distance_meters = 500 AND LOWER(NEW.exercise_name) LIKE '%row%')
        -- 1km treadmill/běh matches
        OR (LOWER(c.title) LIKE '%1km%' AND LOWER(c.title) LIKE '%treadmill%' AND NEW.distance_meters = 1000 AND LOWER(NEW.exercise_name) LIKE '%běh%')
        OR (LOWER(c.title) LIKE '%1km%' AND LOWER(c.title) LIKE '%běh%' AND NEW.distance_meters = 1000 AND LOWER(NEW.exercise_name) LIKE '%běh%')
        OR (LOWER(c.title) LIKE '%1000%' AND NEW.distance_meters = 1000 AND (LOWER(NEW.exercise_name) LIKE '%běh%' OR LOWER(NEW.exercise_name) LIKE '%run%'))
      )
  LOOP
    -- Check if client already has a better submission (for time_lower_better)
    SELECT EXISTS (
      SELECT 1 FROM challenge_submissions cs
      WHERE cs.challenge_id = v_challenge.id
        AND cs.client_id = NEW.client_id
        AND cs.score_primary < NEW.duration_seconds
    ) INTO v_existing_better;

    -- Only insert if no better submission exists OR if multiple attempts allowed
    IF NOT v_existing_better OR v_challenge.allow_multiple_attempts THEN
      -- Ensure pseudonym exists
      PERFORM get_or_create_challenge_pseudonym(v_challenge.id, NEW.client_id);
      
      -- Insert the submission
      INSERT INTO challenge_submissions (
        challenge_id,
        client_id,
        score_primary,
        note,
        status,
        submitted_at
      ) VALUES (
        v_challenge.id,
        NEW.client_id,
        NEW.duration_seconds,
        'Automaticky přidáno z tréninku',
        'approved',
        NOW()
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to auto-submit from exercise entries (for reps, weight-based challenges)
CREATE OR REPLACE FUNCTION public.auto_submit_challenge_from_exercise()
RETURNS TRIGGER AS $$
DECLARE
  v_challenge RECORD;
  v_trainer_id UUID;
  v_existing_better BOOLEAN;
  v_score NUMERIC;
BEGIN
  -- Get the trainer_id for this client
  SELECT user_id INTO v_trainer_id
  FROM clients
  WHERE id = NEW.client_id;

  -- Find matching active challenges
  FOR v_challenge IN 
    SELECT c.* 
    FROM challenges c
    WHERE c.status = 'published'
      AND c.created_by_user_id = v_trainer_id
      AND NOW() BETWEEN c.start_at AND c.end_at
      -- Match challenge title with exercise name (case-insensitive partial match)
      AND (
        -- Pull-ups
        (LOWER(c.title) LIKE '%pull%up%' AND (LOWER(NEW.exercise_name) LIKE '%shyb%' OR LOWER(NEW.exercise_name) LIKE '%pull%up%'))
        -- Wall balls (time-based exercise entry)
        OR (LOWER(c.title) LIKE '%wall%ball%' AND LOWER(NEW.exercise_name) LIKE '%wall%ball%')
        -- Generic name matching
        OR (LOWER(c.title) LIKE '%' || LOWER(SPLIT_PART(NEW.exercise_name, ' ', 1)) || '%')
      )
  LOOP
    -- Determine the score based on metric type
    IF v_challenge.primary_metric = 'reps' THEN
      v_score := COALESCE(NEW.reps, 0);
    ELSIF v_challenge.primary_metric = 'weight_kg' THEN
      v_score := COALESCE(NEW.weight_kg, 0);
    ELSIF v_challenge.primary_metric = 'time_seconds' THEN
      v_score := COALESCE(NEW.time_seconds, 0);
    ELSE
      v_score := COALESCE(NEW.reps, 0);
    END IF;

    -- Skip if score is 0
    IF v_score <= 0 THEN
      CONTINUE;
    END IF;

    -- Check for existing better submission
    IF v_challenge.scoring_type = 'time_lower_better' THEN
      SELECT EXISTS (
        SELECT 1 FROM challenge_submissions cs
        WHERE cs.challenge_id = v_challenge.id
          AND cs.client_id = NEW.client_id
          AND cs.score_primary < v_score
      ) INTO v_existing_better;
    ELSE -- value_higher_better
      SELECT EXISTS (
        SELECT 1 FROM challenge_submissions cs
        WHERE cs.challenge_id = v_challenge.id
          AND cs.client_id = NEW.client_id
          AND cs.score_primary > v_score
      ) INTO v_existing_better;
    END IF;

    -- Only insert if no better submission exists OR if multiple attempts allowed
    IF NOT v_existing_better OR v_challenge.allow_multiple_attempts THEN
      -- Ensure pseudonym exists
      PERFORM get_or_create_challenge_pseudonym(v_challenge.id, NEW.client_id);
      
      -- Insert the submission
      INSERT INTO challenge_submissions (
        challenge_id,
        client_id,
        score_primary,
        note,
        status,
        submitted_at
      ) VALUES (
        v_challenge.id,
        NEW.client_id,
        v_score,
        'Automaticky přidáno z tréninku',
        'approved',
        NOW()
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
DROP TRIGGER IF EXISTS auto_submit_cardio_to_challenge ON cardio_entries;
CREATE TRIGGER auto_submit_cardio_to_challenge
  AFTER INSERT ON cardio_entries
  FOR EACH ROW
  EXECUTE FUNCTION auto_submit_challenge_from_cardio();

DROP TRIGGER IF EXISTS auto_submit_exercise_to_challenge ON exercise_entries;
CREATE TRIGGER auto_submit_exercise_to_challenge
  AFTER INSERT ON exercise_entries
  FOR EACH ROW
  EXECUTE FUNCTION auto_submit_challenge_from_exercise();