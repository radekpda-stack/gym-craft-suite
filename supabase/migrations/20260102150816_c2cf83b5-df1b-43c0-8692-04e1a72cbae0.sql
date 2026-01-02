
-- 1. Auto-activate all existing clients in leaderboard_settings
INSERT INTO client_leaderboard_settings (client_id, leaderboard_nickname, leaderboard_visible)
SELECT id, name, true 
FROM clients 
WHERE is_archived = false AND is_system = false
ON CONFLICT (client_id) DO UPDATE SET leaderboard_visible = true;

-- 2. Trigger for auto-adding new clients to leaderboard
CREATE OR REPLACE FUNCTION public.auto_add_client_to_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_system = false THEN
    INSERT INTO client_leaderboard_settings (client_id, leaderboard_nickname, leaderboard_visible)
    VALUES (NEW.id, NEW.name, true)
    ON CONFLICT (client_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_client_created_add_to_leaderboard ON clients;
CREATE TRIGGER on_client_created_add_to_leaderboard
AFTER INSERT ON clients
FOR EACH ROW EXECUTE FUNCTION public.auto_add_client_to_leaderboard();

-- 3. Populate historical XP from training_sessions (10 XP each)
INSERT INTO xp_events (client_id, source_type, source_id, xp_amount, description, created_at)
SELECT client_id, 'training_session', id, 10, 'Koučovaný trénink', COALESCE(date::timestamp with time zone, created_at)
FROM training_sessions 
WHERE status = 'completed' AND client_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4. Populate historical XP from exercise_entries (2 XP, 5 for PR)
INSERT INTO xp_events (client_id, source_type, source_id, xp_amount, description, created_at)
SELECT client_id, 'exercise_entry', id, 
  CASE WHEN is_pr = true THEN 5 ELSE 2 END,
  CASE WHEN is_pr = true THEN 'Osobní rekord: ' || exercise_name ELSE 'Záznam cviku: ' || exercise_name END,
  created_at
FROM exercise_entries
WHERE client_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5. Populate historical XP from cardio_entries (3 XP each)
INSERT INTO xp_events (client_id, source_type, source_id, xp_amount, description, created_at)
SELECT client_id, 'cardio_entry', id, 3, 'Kardio: ' || exercise_name, created_at
FROM cardio_entries
WHERE client_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 6. Populate historical XP from skill_entries (2 XP each)
INSERT INTO xp_events (client_id, source_type, source_id, xp_amount, description, created_at)
SELECT client_id, 'skill_entry', id, 2, 'Skill: ' || exercise_name, created_at
FROM skill_entries
WHERE client_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 7. Recalculate client_xp table from xp_events
INSERT INTO client_xp (client_id, total_xp, level, level_xp, xp_to_next, last_xp_date, updated_at)
SELECT 
  client_id,
  COALESCE(SUM(xp_amount), 0) as total_xp,
  GREATEST(1, FLOOR(COALESCE(SUM(xp_amount), 0)::numeric / 100) + 1)::int as level,
  (COALESCE(SUM(xp_amount), 0) % 100)::int as level_xp,
  (100 - (COALESCE(SUM(xp_amount), 0) % 100))::int as xp_to_next,
  MAX(created_at) as last_xp_date,
  NOW() as updated_at
FROM xp_events
GROUP BY client_id
ON CONFLICT (client_id) DO UPDATE SET
  total_xp = EXCLUDED.total_xp,
  level = EXCLUDED.level,
  level_xp = EXCLUDED.level_xp,
  xp_to_next = EXCLUDED.xp_to_next,
  last_xp_date = EXCLUDED.last_xp_date,
  updated_at = NOW();

-- 8. Trigger for awarding XP on new exercise_entries
CREATE OR REPLACE FUNCTION public.award_xp_for_exercise_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_xp_amount INT;
BEGIN
  IF NEW.client_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  v_xp_amount := CASE WHEN NEW.is_pr = true THEN 5 ELSE 2 END;
  
  INSERT INTO xp_events (client_id, source_type, source_id, xp_amount, description)
  VALUES (NEW.client_id, 'exercise_entry', NEW.id, v_xp_amount,
    CASE WHEN NEW.is_pr = true THEN 'Osobní rekord: ' || NEW.exercise_name 
         ELSE 'Záznam cviku: ' || NEW.exercise_name END);
  
  INSERT INTO client_xp (client_id, total_xp, level, level_xp, xp_to_next, last_xp_date)
  VALUES (NEW.client_id, v_xp_amount, 1, v_xp_amount, 100 - v_xp_amount, NOW())
  ON CONFLICT (client_id) DO UPDATE SET
    total_xp = client_xp.total_xp + v_xp_amount,
    level = GREATEST(1, FLOOR((client_xp.total_xp + v_xp_amount)::numeric / 100) + 1)::int,
    level_xp = ((client_xp.total_xp + v_xp_amount) % 100)::int,
    xp_to_next = (100 - ((client_xp.total_xp + v_xp_amount) % 100))::int,
    last_xp_date = NOW(),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_exercise_entry_award_xp ON exercise_entries;
CREATE TRIGGER on_exercise_entry_award_xp
AFTER INSERT ON exercise_entries
FOR EACH ROW EXECUTE FUNCTION public.award_xp_for_exercise_entry();

-- 9. Trigger for awarding XP on new cardio_entries (3 XP)
CREATE OR REPLACE FUNCTION public.award_xp_for_cardio_entry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  INSERT INTO xp_events (client_id, source_type, source_id, xp_amount, description)
  VALUES (NEW.client_id, 'cardio_entry', NEW.id, 3, 'Kardio: ' || NEW.exercise_name);
  
  INSERT INTO client_xp (client_id, total_xp, level, level_xp, xp_to_next, last_xp_date)
  VALUES (NEW.client_id, 3, 1, 3, 97, NOW())
  ON CONFLICT (client_id) DO UPDATE SET
    total_xp = client_xp.total_xp + 3,
    level = GREATEST(1, FLOOR((client_xp.total_xp + 3)::numeric / 100) + 1)::int,
    level_xp = ((client_xp.total_xp + 3) % 100)::int,
    xp_to_next = (100 - ((client_xp.total_xp + 3) % 100))::int,
    last_xp_date = NOW(),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_cardio_entry_award_xp ON cardio_entries;
CREATE TRIGGER on_cardio_entry_award_xp
AFTER INSERT ON cardio_entries
FOR EACH ROW EXECUTE FUNCTION public.award_xp_for_cardio_entry();

-- 10. Trigger for awarding XP on new skill_entries (2 XP)
CREATE OR REPLACE FUNCTION public.award_xp_for_skill_entry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  INSERT INTO xp_events (client_id, source_type, source_id, xp_amount, description)
  VALUES (NEW.client_id, 'skill_entry', NEW.id, 2, 'Skill: ' || NEW.exercise_name);
  
  INSERT INTO client_xp (client_id, total_xp, level, level_xp, xp_to_next, last_xp_date)
  VALUES (NEW.client_id, 2, 1, 2, 98, NOW())
  ON CONFLICT (client_id) DO UPDATE SET
    total_xp = client_xp.total_xp + 2,
    level = GREATEST(1, FLOOR((client_xp.total_xp + 2)::numeric / 100) + 1)::int,
    level_xp = ((client_xp.total_xp + 2) % 100)::int,
    xp_to_next = (100 - ((client_xp.total_xp + 2) % 100))::int,
    last_xp_date = NOW(),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_skill_entry_award_xp ON skill_entries;
CREATE TRIGGER on_skill_entry_award_xp
AFTER INSERT ON skill_entries
FOR EACH ROW EXECUTE FUNCTION public.award_xp_for_skill_entry();

-- 11. Trigger for awarding XP when training_session is completed (10 XP)
CREATE OR REPLACE FUNCTION public.award_xp_for_training_session()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Only award XP when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'completed') THEN
    INSERT INTO xp_events (client_id, source_type, source_id, xp_amount, description)
    VALUES (NEW.client_id, 'training_session', NEW.id, 10, 'Koučovaný trénink');
    
    INSERT INTO client_xp (client_id, total_xp, level, level_xp, xp_to_next, last_xp_date)
    VALUES (NEW.client_id, 10, 1, 10, 90, NOW())
    ON CONFLICT (client_id) DO UPDATE SET
      total_xp = client_xp.total_xp + 10,
      level = GREATEST(1, FLOOR((client_xp.total_xp + 10)::numeric / 100) + 1)::int,
      level_xp = ((client_xp.total_xp + 10) % 100)::int,
      xp_to_next = (100 - ((client_xp.total_xp + 10) % 100))::int,
      last_xp_date = NOW(),
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_training_session_award_xp ON training_sessions;
CREATE TRIGGER on_training_session_award_xp
AFTER INSERT OR UPDATE ON training_sessions
FOR EACH ROW EXECUTE FUNCTION public.award_xp_for_training_session();
