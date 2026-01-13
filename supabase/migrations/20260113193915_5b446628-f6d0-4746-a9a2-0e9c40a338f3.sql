
-- Function to auto-submit cardio entries to matching challenges
CREATE OR REPLACE FUNCTION public.auto_submit_cardio_to_challenge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge record;
  v_score_primary numeric;
  v_existing_submission record;
  v_is_better boolean;
BEGIN
  -- Find active challenges for this exercise
  FOR v_challenge IN
    SELECT c.* 
    FROM challenges c
    LEFT JOIN exercises e ON c.exercise_id = e.id
    WHERE c.status = 'published'
      AND c.start_at <= now()
      AND c.end_at > now()
      AND c.created_by_user_id = NEW.user_id
      AND (
        -- Match by exercise_id
        c.exercise_id = NEW.exercise_id
        -- Or match by exercise name (case insensitive)
        OR LOWER(TRIM(e.name_cs)) = LOWER(TRIM(NEW.exercise_name))
        OR LOWER(TRIM(e.name_en)) = LOWER(TRIM(NEW.exercise_name))
      )
  LOOP
    -- Calculate score based on challenge's primary metric
    CASE v_challenge.primary_metric
      WHEN 'time' THEN
        -- For time challenges, score is duration in seconds (lower is better)
        v_score_primary := NEW.duration_seconds;
      WHEN 'distance' THEN
        -- For distance challenges, score is distance in meters (higher is better typically)
        v_score_primary := NEW.distance_meters;
      WHEN 'watts' THEN
        v_score_primary := NEW.avg_watts;
      ELSE
        -- Default to duration for cardio
        v_score_primary := NEW.duration_seconds;
    END CASE;
    
    -- Skip if no valid score
    IF v_score_primary IS NULL OR v_score_primary <= 0 THEN
      CONTINUE;
    END IF;
    
    -- Ensure participant record exists
    PERFORM get_or_create_challenge_pseudonym(v_challenge.id, NEW.client_id);
    
    -- Check for existing submission
    SELECT * INTO v_existing_submission
    FROM challenge_submissions
    WHERE challenge_id = v_challenge.id 
      AND client_id = NEW.client_id
      AND status = 'approved'
    ORDER BY 
      CASE WHEN v_challenge.scoring_type = 'time_lower_better' THEN score_primary END ASC,
      CASE WHEN v_challenge.scoring_type != 'time_lower_better' THEN score_primary END DESC
    LIMIT 1;
    
    -- Determine if this is a better score
    IF v_existing_submission IS NULL THEN
      v_is_better := true;
    ELSIF v_challenge.scoring_type = 'time_lower_better' THEN
      v_is_better := v_score_primary < v_existing_submission.score_primary;
    ELSE
      v_is_better := v_score_primary > v_existing_submission.score_primary;
    END IF;
    
    -- Only submit if challenge allows multiple attempts or this is first/better attempt
    IF v_challenge.allow_multiple_attempts = true OR v_existing_submission IS NULL THEN
      -- Insert new submission
      INSERT INTO challenge_submissions (
        challenge_id,
        client_id,
        score_primary,
        status,
        submitted_at,
        note
      ) VALUES (
        v_challenge.id,
        NEW.client_id,
        v_score_primary,
        'approved',
        now(),
        'Automaticky přidáno z cardio záznamu'
      );
      
      RAISE NOTICE 'Auto-submitted cardio entry % to challenge %', NEW.id, v_challenge.id;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Function to auto-submit exercise entries to matching challenges
CREATE OR REPLACE FUNCTION public.auto_submit_exercise_to_challenge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge record;
  v_score_primary numeric;
  v_existing_submission record;
  v_is_better boolean;
BEGIN
  -- Find active challenges for this exercise
  FOR v_challenge IN
    SELECT c.* 
    FROM challenges c
    LEFT JOIN exercises e ON c.exercise_id = e.id
    WHERE c.status = 'published'
      AND c.start_at <= now()
      AND c.end_at > now()
      AND c.created_by_user_id = NEW.user_id
      AND (
        -- Match by exercise_id
        c.exercise_id = NEW.exercise_id
        -- Or match by exercise name (case insensitive)
        OR LOWER(TRIM(e.name_cs)) = LOWER(TRIM(NEW.exercise_name))
        OR LOWER(TRIM(e.name_en)) = LOWER(TRIM(NEW.exercise_name))
      )
  LOOP
    -- Calculate score based on challenge's primary metric
    CASE v_challenge.primary_metric
      WHEN 'weight' THEN
        v_score_primary := NEW.weight_kg;
      WHEN 'reps' THEN
        v_score_primary := NEW.reps;
      WHEN 'time' THEN
        v_score_primary := NEW.time_seconds;
      WHEN 'distance' THEN
        v_score_primary := NEW.distance_meters;
      WHEN 'height' THEN
        v_score_primary := COALESCE(NEW.height_cm, NEW.distance_meters * 100);
      ELSE
        -- Default to weight for strength exercises
        v_score_primary := NEW.weight_kg;
    END CASE;
    
    -- Skip if no valid score
    IF v_score_primary IS NULL OR v_score_primary <= 0 THEN
      CONTINUE;
    END IF;
    
    -- Ensure participant record exists
    PERFORM get_or_create_challenge_pseudonym(v_challenge.id, NEW.client_id);
    
    -- Check for existing submission
    SELECT * INTO v_existing_submission
    FROM challenge_submissions
    WHERE challenge_id = v_challenge.id 
      AND client_id = NEW.client_id
      AND status = 'approved'
    ORDER BY 
      CASE WHEN v_challenge.scoring_type = 'time_lower_better' THEN score_primary END ASC,
      CASE WHEN v_challenge.scoring_type != 'time_lower_better' THEN score_primary END DESC
    LIMIT 1;
    
    -- Determine if this is a better score
    IF v_existing_submission IS NULL THEN
      v_is_better := true;
    ELSIF v_challenge.scoring_type = 'time_lower_better' THEN
      v_is_better := v_score_primary < v_existing_submission.score_primary;
    ELSE
      v_is_better := v_score_primary > v_existing_submission.score_primary;
    END IF;
    
    -- Only submit if challenge allows multiple attempts or this is first/better attempt
    IF v_challenge.allow_multiple_attempts = true OR v_existing_submission IS NULL THEN
      -- Insert new submission
      INSERT INTO challenge_submissions (
        challenge_id,
        client_id,
        score_primary,
        status,
        submitted_at,
        note
      ) VALUES (
        v_challenge.id,
        NEW.client_id,
        v_score_primary,
        'approved',
        now(),
        'Automaticky přidáno ze záznamu cvičení'
      );
      
      RAISE NOTICE 'Auto-submitted exercise entry % to challenge %', NEW.id, v_challenge.id;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trg_auto_submit_cardio_to_challenge ON cardio_entries;
CREATE TRIGGER trg_auto_submit_cardio_to_challenge
  AFTER INSERT ON cardio_entries
  FOR EACH ROW
  EXECUTE FUNCTION auto_submit_cardio_to_challenge();

DROP TRIGGER IF EXISTS trg_auto_submit_exercise_to_challenge ON exercise_entries;
CREATE TRIGGER trg_auto_submit_exercise_to_challenge
  AFTER INSERT ON exercise_entries
  FOR EACH ROW
  EXECUTE FUNCTION auto_submit_exercise_to_challenge();

-- Now let's also add Milan Dolák's existing cardio entry to the challenge
-- First find his cardio entry for rowing 500m
DO $$
DECLARE
  v_client_id uuid := '44c24ca5-a85b-4a1e-b477-314f274f20fd'; -- Milan Dolák
  v_challenge_id uuid;
  v_cardio_entry record;
  v_score numeric;
BEGIN
  -- Find the Row 500m challenge
  SELECT id INTO v_challenge_id
  FROM challenges
  WHERE title ILIKE '%row%500%' OR title ILIKE '%500%row%'
  LIMIT 1;
  
  IF v_challenge_id IS NULL THEN
    RAISE NOTICE 'Challenge not found';
    RETURN;
  END IF;
  
  -- Find Milan's cardio entry for rowing
  SELECT * INTO v_cardio_entry
  FROM cardio_entries
  WHERE client_id = v_client_id
    AND (exercise_name ILIKE '%veslo%' OR exercise_name ILIKE '%row%')
  ORDER BY date DESC
  LIMIT 1;
  
  IF v_cardio_entry IS NULL THEN
    RAISE NOTICE 'Cardio entry not found for Milan';
    RETURN;
  END IF;
  
  -- Calculate score (duration in seconds)
  v_score := v_cardio_entry.duration_seconds;
  
  -- Check if submission already exists
  IF EXISTS (SELECT 1 FROM challenge_submissions WHERE challenge_id = v_challenge_id AND client_id = v_client_id) THEN
    RAISE NOTICE 'Submission already exists';
    RETURN;
  END IF;
  
  -- Create participant record
  PERFORM get_or_create_challenge_pseudonym(v_challenge_id, v_client_id);
  
  -- Create submission
  INSERT INTO challenge_submissions (
    challenge_id,
    client_id,
    score_primary,
    status,
    submitted_at,
    note
  ) VALUES (
    v_challenge_id,
    v_client_id,
    v_score,
    'approved',
    v_cardio_entry.created_at,
    'Automaticky přidáno z existujícího cardio záznamu'
  );
  
  RAISE NOTICE 'Added Milan Dolák to challenge with score %', v_score;
END;
$$;
