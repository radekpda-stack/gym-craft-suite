-- Oprava Security Definer View problému
-- Nahradíme view za obyčejnou tabulkovou funkci

DROP VIEW IF EXISTS training_session_inherited_tags;

-- Vytvořím běžnou funkci místo view
CREATE OR REPLACE FUNCTION get_inherited_tags_for_session(p_session_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT array_agg(DISTINCT etm.tag_id) FILTER (WHERE etm.tag_id IS NOT NULL)
  FROM workout_entries we
  JOIN exercise_tag_map etm ON etm.exercise_id = we.exercise_id
  WHERE we.training_session_id = p_session_id;
$$;

-- Aktualizujeme get_training_session_all_tags aby používala SECURITY INVOKER
DROP FUNCTION IF EXISTS get_training_session_all_tags(uuid);

CREATE OR REPLACE FUNCTION get_training_session_all_tags(p_session_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT array_agg(DISTINCT tag_id) 
  FROM (
    -- Vlastní tagy tréninku
    SELECT tag_id FROM training_session_tags WHERE training_session_id = p_session_id
    UNION
    -- Zděděné tagy z cviků
    SELECT UNNEST(get_inherited_tags_for_session(p_session_id)) as tag_id
  ) all_tags
  WHERE tag_id IS NOT NULL;
$$;