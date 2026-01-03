
-- Function to recalculate badge progress for a client
CREATE OR REPLACE FUNCTION public.recalculate_client_badges(p_client_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_badge RECORD;
  v_progress_current INTEGER;
  v_progress_target INTEGER;
  v_should_earn BOOLEAN;
  v_total_workouts INTEGER;
  v_streak_weeks INTEGER;
  v_type_count INTEGER;
BEGIN
  -- Get total confirmed workouts for this client
  SELECT COUNT(*) INTO v_total_workouts
  FROM client_confirmed_workouts
  WHERE client_id = p_client_id;
  
  -- Also count training sessions marked as completed
  SELECT v_total_workouts + COUNT(*) INTO v_total_workouts
  FROM training_sessions
  WHERE client_id = p_client_id AND status = 'completed';
  
  -- Calculate current streak (weeks)
  WITH weekly_workouts AS (
    SELECT DISTINCT date_trunc('week', performed_date::date) as week
    FROM client_confirmed_workouts
    WHERE client_id = p_client_id
    UNION
    SELECT DISTINCT date_trunc('week', date::date) as week
    FROM training_sessions
    WHERE client_id = p_client_id AND status = 'completed'
  ),
  ordered_weeks AS (
    SELECT week, 
           ROW_NUMBER() OVER (ORDER BY week DESC) as rn,
           EXTRACT(EPOCH FROM (LAG(week) OVER (ORDER BY week DESC) - week)) / 604800 as gap_weeks
    FROM weekly_workouts
  )
  SELECT COUNT(*) INTO v_streak_weeks
  FROM ordered_weeks
  WHERE rn = 1 OR gap_weeks <= 1.5;

  -- Loop through all active badge definitions
  FOR v_badge IN 
    SELECT * FROM badge_definitions WHERE is_active = true
  LOOP
    v_progress_current := 0;
    v_progress_target := 1;
    v_should_earn := false;
    
    -- Calculate progress based on rule_type
    CASE v_badge.rule_type
      WHEN 'milestone_total' THEN
        v_progress_target := COALESCE((v_badge.rule_value->>'count')::INTEGER, 1);
        v_progress_current := LEAST(v_total_workouts, v_progress_target);
        v_should_earn := v_total_workouts >= v_progress_target;
        
      WHEN 'streak_weeks' THEN
        v_progress_target := COALESCE((v_badge.rule_value->>'weeks')::INTEGER, 1);
        v_progress_current := LEAST(v_streak_weeks, v_progress_target);
        v_should_earn := v_streak_weeks >= v_progress_target;
        
      WHEN 'type_count' THEN
        v_progress_target := COALESCE((v_badge.rule_value->>'count')::INTEGER, 1);
        -- Count workouts of specific type
        SELECT COUNT(*) INTO v_type_count
        FROM (
          SELECT 1 FROM client_confirmed_workouts 
          WHERE client_id = p_client_id 
            AND workout_type = v_badge.rule_value->>'type'
          UNION ALL
          SELECT 1 FROM training_sessions 
          WHERE client_id = p_client_id 
            AND status = 'completed'
            AND training_type = v_badge.rule_value->>'type'
        ) t;
        v_progress_current := LEAST(v_type_count, v_progress_target);
        v_should_earn := v_type_count >= v_progress_target;
        
      ELSE
        -- For special badges, we'll handle them separately or skip
        v_progress_target := 1;
        v_progress_current := 0;
    END CASE;
    
    -- Upsert the client_badges record
    INSERT INTO client_badges (
      client_id,
      badge_id,
      progress_current,
      progress_target,
      earned_at,
      updated_at
    ) VALUES (
      p_client_id,
      v_badge.id,
      v_progress_current,
      v_progress_target,
      CASE WHEN v_should_earn THEN NOW() ELSE NULL END,
      NOW()
    )
    ON CONFLICT (client_id, badge_id) 
    DO UPDATE SET
      progress_current = EXCLUDED.progress_current,
      progress_target = EXCLUDED.progress_target,
      earned_at = CASE 
        WHEN client_badges.earned_at IS NOT NULL THEN client_badges.earned_at
        WHEN v_should_earn THEN NOW()
        ELSE NULL
      END,
      updated_at = NOW();
      
  END LOOP;
END;
$$;

-- Trigger function to call recalculate_client_badges
CREATE OR REPLACE FUNCTION public.trigger_recalculate_badges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Call the recalculate function for the affected client
  PERFORM recalculate_client_badges(COALESCE(NEW.client_id, OLD.client_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers on client_confirmed_workouts
DROP TRIGGER IF EXISTS trg_recalc_badges_on_confirmed_workout ON client_confirmed_workouts;
CREATE TRIGGER trg_recalc_badges_on_confirmed_workout
  AFTER INSERT OR UPDATE OR DELETE ON client_confirmed_workouts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_badges();

-- Create triggers on training_sessions
DROP TRIGGER IF EXISTS trg_recalc_badges_on_training_session ON training_sessions;
CREATE TRIGGER trg_recalc_badges_on_training_session
  AFTER INSERT OR UPDATE OF status ON training_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_badges();

-- Add unique constraint if not exists (for upsert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'client_badges_client_id_badge_id_key'
  ) THEN
    ALTER TABLE client_badges 
    ADD CONSTRAINT client_badges_client_id_badge_id_key 
    UNIQUE (client_id, badge_id);
  END IF;
END $$;

-- Now recalculate badges for all existing clients that have workouts
DO $$
DECLARE
  v_client_id UUID;
BEGIN
  FOR v_client_id IN 
    SELECT DISTINCT client_id FROM (
      SELECT client_id FROM client_confirmed_workouts
      UNION
      SELECT client_id FROM training_sessions WHERE status = 'completed'
    ) t
  LOOP
    PERFORM recalculate_client_badges(v_client_id);
  END LOOP;
END $$;
