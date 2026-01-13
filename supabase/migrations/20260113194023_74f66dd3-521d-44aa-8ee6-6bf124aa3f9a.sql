
-- Update the auto_submit_exercise_to_challenge function to also match by exercise_id directly
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
        -- Match by exercise_id directly
        (NEW.exercise_id IS NOT NULL AND c.exercise_id = NEW.exercise_id)
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
      WHEN 'time', 'time_seconds' THEN
        v_score_primary := NEW.time_seconds;
      WHEN 'distance' THEN
        v_score_primary := NEW.distance_meters;
      WHEN 'height' THEN
        v_score_primary := COALESCE(NEW.height_cm, NEW.distance_meters * 100);
      ELSE
        -- Default to weight for strength exercises, or time if available
        v_score_primary := COALESCE(NEW.weight_kg, NEW.time_seconds);
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

-- Also update cardio trigger to match by exercise_id directly
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
        -- Match by exercise_id directly
        (NEW.exercise_id IS NOT NULL AND c.exercise_id = NEW.exercise_id)
        -- Or match by exercise name (case insensitive)
        OR LOWER(TRIM(e.name_cs)) = LOWER(TRIM(NEW.exercise_name))
        OR LOWER(TRIM(e.name_en)) = LOWER(TRIM(NEW.exercise_name))
      )
  LOOP
    -- Calculate score based on challenge's primary metric
    CASE v_challenge.primary_metric
      WHEN 'time', 'time_seconds' THEN
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
