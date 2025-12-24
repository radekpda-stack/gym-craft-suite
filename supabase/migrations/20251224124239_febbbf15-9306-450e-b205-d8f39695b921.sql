-- Fáze 3: Propojení tagů a cviků

-- 3.1 Automatické přiřazení tagů cvikům podle muscle_groups
-- Mapování: muscle_groups → body_part tagy

-- Dolní část (quadriceps, hamstrings, glutes, calves, adductors, legs)
INSERT INTO exercise_tag_map (exercise_id, tag_id)
SELECT DISTINCT e.id, 'd5f602c0-1711-435e-84d7-6c2863a753a7'::uuid
FROM exercises e
WHERE e.muscle_groups && ARRAY['quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors', 'legs']
  AND NOT EXISTS (
    SELECT 1 FROM exercise_tag_map etm 
    WHERE etm.exercise_id = e.id AND etm.tag_id = 'd5f602c0-1711-435e-84d7-6c2863a753a7'::uuid
  );

-- Horní část (chest, back, shoulders, lats, biceps, triceps, rhomboids, traps)
INSERT INTO exercise_tag_map (exercise_id, tag_id)
SELECT DISTINCT e.id, '05427be9-cf51-4d10-a5be-749626fdbec2'::uuid
FROM exercises e
WHERE e.muscle_groups && ARRAY['chest', 'back', 'shoulders', 'lats', 'biceps', 'triceps', 'rhomboids', 'traps']
  AND NOT EXISTS (
    SELECT 1 FROM exercise_tag_map etm 
    WHERE etm.exercise_id = e.id AND etm.tag_id = '05427be9-cf51-4d10-a5be-749626fdbec2'::uuid
  );

-- Core
INSERT INTO exercise_tag_map (exercise_id, tag_id)
SELECT DISTINCT e.id, '269de143-7273-48e8-a923-b3e1579ab3ae'::uuid
FROM exercises e
WHERE e.muscle_groups && ARRAY['core', 'obliques']
  AND NOT EXISTS (
    SELECT 1 FROM exercise_tag_map etm 
    WHERE etm.exercise_id = e.id AND etm.tag_id = '269de143-7273-48e8-a923-b3e1579ab3ae'::uuid
  );

-- Hýždě (glutes)
INSERT INTO exercise_tag_map (exercise_id, tag_id)
SELECT DISTINCT e.id, 'd8b79e9d-6831-4a6a-888b-9de24c2795eb'::uuid
FROM exercises e
WHERE e.muscle_groups && ARRAY['glutes']
  AND NOT EXISTS (
    SELECT 1 FROM exercise_tag_map etm 
    WHERE etm.exercise_id = e.id AND etm.tag_id = 'd8b79e9d-6831-4a6a-888b-9de24c2795eb'::uuid
  );

-- Přední stehna (quadriceps)
INSERT INTO exercise_tag_map (exercise_id, tag_id)
SELECT DISTINCT e.id, 'abe3b223-cbf2-4529-ade0-a87bd11f41c6'::uuid
FROM exercises e
WHERE e.muscle_groups && ARRAY['quadriceps']
  AND NOT EXISTS (
    SELECT 1 FROM exercise_tag_map etm 
    WHERE etm.exercise_id = e.id AND etm.tag_id = 'abe3b223-cbf2-4529-ade0-a87bd11f41c6'::uuid
  );

-- Zadní stehna (hamstrings)
INSERT INTO exercise_tag_map (exercise_id, tag_id)
SELECT DISTINCT e.id, '68d721df-e6ad-4022-8562-f966a283a7a3'::uuid
FROM exercises e
WHERE e.muscle_groups && ARRAY['hamstrings']
  AND NOT EXISTS (
    SELECT 1 FROM exercise_tag_map etm 
    WHERE etm.exercise_id = e.id AND etm.tag_id = '68d721df-e6ad-4022-8562-f966a283a7a3'::uuid
  );

-- Ramena (shoulders)
INSERT INTO exercise_tag_map (exercise_id, tag_id)
SELECT DISTINCT e.id, '53f2aece-4b41-4c1a-a21d-d574ea269e5f'::uuid
FROM exercises e
WHERE e.muscle_groups && ARRAY['shoulders', 'rear delts']
  AND NOT EXISTS (
    SELECT 1 FROM exercise_tag_map etm 
    WHERE etm.exercise_id = e.id AND etm.tag_id = '53f2aece-4b41-4c1a-a21d-d574ea269e5f'::uuid
  );

-- Lýtka (calves)
INSERT INTO exercise_tag_map (exercise_id, tag_id)
SELECT DISTINCT e.id, '303c89c1-6c3e-4774-bec1-95e9f9f2a720'::uuid
FROM exercises e
WHERE e.muscle_groups && ARRAY['calves']
  AND NOT EXISTS (
    SELECT 1 FROM exercise_tag_map etm 
    WHERE etm.exercise_id = e.id AND etm.tag_id = '303c89c1-6c3e-4774-bec1-95e9f9f2a720'::uuid
  );

-- Šikmé břišní svalstvo (obliques)
INSERT INTO exercise_tag_map (exercise_id, tag_id)
SELECT DISTINCT e.id, '2715cf01-9f3b-4318-929e-2a3c454952cb'::uuid
FROM exercises e
WHERE e.muscle_groups && ARRAY['obliques']
  AND NOT EXISTS (
    SELECT 1 FROM exercise_tag_map etm 
    WHERE etm.exercise_id = e.id AND etm.tag_id = '2715cf01-9f3b-4318-929e-2a3c454952cb'::uuid
  );

-- Střed těla = Core (duplicate mapping for compatibility)
INSERT INTO exercise_tag_map (exercise_id, tag_id)
SELECT DISTINCT e.id, '72d6af4d-345b-46d2-8a22-c456bbdbaa8f'::uuid
FROM exercises e
WHERE e.muscle_groups && ARRAY['core']
  AND NOT EXISTS (
    SELECT 1 FROM exercise_tag_map etm 
    WHERE etm.exercise_id = e.id AND etm.tag_id = '72d6af4d-345b-46d2-8a22-c456bbdbaa8f'::uuid
  );

-- Focus tagy podle kategorie cviku
-- Kardio tag pro kardio cviky
INSERT INTO exercise_tag_map (exercise_id, tag_id)
SELECT DISTINCT e.id, '5324e966-80c7-42e6-a92a-7f79d0c13407'::uuid
FROM exercises e
WHERE e.category = 'Kardio'
  AND NOT EXISTS (
    SELECT 1 FROM exercise_tag_map etm 
    WHERE etm.exercise_id = e.id AND etm.tag_id = '5324e966-80c7-42e6-a92a-7f79d0c13407'::uuid
  );

-- Síla tag pro silové cviky
INSERT INTO exercise_tag_map (exercise_id, tag_id)
SELECT DISTINCT e.id, '141ed4ba-bfa0-4ac6-ae13-fcfc8e5ff446'::uuid
FROM exercises e
WHERE e.category IN ('Síla', 'Horní tělo', 'Dolní tělo', 'Nohy', 'Paže', 'Záda', 'Hrudník', 'Ramena')
  AND NOT EXISTS (
    SELECT 1 FROM exercise_tag_map etm 
    WHERE etm.exercise_id = e.id AND etm.tag_id = '141ed4ba-bfa0-4ac6-ae13-fcfc8e5ff446'::uuid
  );

-- Mobilita tag
INSERT INTO exercise_tag_map (exercise_id, tag_id)
SELECT DISTINCT e.id, '7a7787aa-e22f-46c7-b7b0-6469707f6894'::uuid
FROM exercises e
WHERE e.category IN ('Mobilita', 'Flexibility')
  AND NOT EXISTS (
    SELECT 1 FROM exercise_tag_map etm 
    WHERE etm.exercise_id = e.id AND etm.tag_id = '7a7787aa-e22f-46c7-b7b0-6469707f6894'::uuid
  );

-- 3.2 View pro agregaci tagů tréninku z cviků
CREATE OR REPLACE VIEW training_session_inherited_tags AS
SELECT 
  ts.id as training_session_id,
  array_agg(DISTINCT etm.tag_id) FILTER (WHERE etm.tag_id IS NOT NULL) as inherited_tag_ids
FROM training_sessions ts
LEFT JOIN workout_entries we ON we.training_session_id = ts.id
LEFT JOIN exercise_tag_map etm ON etm.exercise_id = we.exercise_id
GROUP BY ts.id;

-- 3.3 Funkce pro získání všech tagů tréninku (vlastní + zděděné)
CREATE OR REPLACE FUNCTION get_training_session_all_tags(p_session_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT array_agg(DISTINCT tag_id) 
  FROM (
    -- Vlastní tagy tréninku
    SELECT tag_id FROM training_session_tags WHERE training_session_id = p_session_id
    UNION
    -- Zděděné tagy z cviků
    SELECT UNNEST(inherited_tag_ids) as tag_id 
    FROM training_session_inherited_tags 
    WHERE training_session_id = p_session_id
  ) all_tags
  WHERE tag_id IS NOT NULL;
$$;