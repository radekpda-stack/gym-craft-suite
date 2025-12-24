-- Fáze 1.1: Přidání training_session_id do exercise_entries
ALTER TABLE exercise_entries 
ADD COLUMN IF NOT EXISTS training_session_id uuid REFERENCES training_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_exercise_entries_training_session 
ON exercise_entries(training_session_id);

-- Fáze 1.2: Normalizace muscle_groups na anglické názvy
UPDATE exercises SET muscle_groups = (
  SELECT array_agg(DISTINCT 
    CASE 
      WHEN mg = 'Biceps' THEN 'biceps'
      WHEN mg = 'Core' THEN 'core'
      WHEN mg = 'Triceps' THEN 'triceps'
      WHEN mg = 'Quadriceps' THEN 'quadriceps'
      WHEN mg = 'Gluteus' THEN 'glutes'
      WHEN mg = 'Hamstringy' THEN 'hamstrings'
      WHEN mg = 'Latissimus' THEN 'lats'
      WHEN mg = 'Břišní svaly' THEN 'core'
      WHEN mg = 'Deltové svaly' THEN 'shoulders'
      WHEN mg = 'Prsní svaly' THEN 'chest'
      WHEN mg = 'Záda' THEN 'back'
      ELSE mg
    END
  )
  FROM unnest(muscle_groups) AS mg
)
WHERE muscle_groups IS NOT NULL;

-- Fáze 1.3: Hromadné přiřazení movement_pattern
-- Povolené hodnoty: squat, hinge, lunge, push_horizontal, push_vertical, diagonal_press, 
-- pull_horizontal, pull_vertical, carry, rotation, core_anti_extension, core_anti_rotation, 
-- core_anti_lateral_flexion, locomotion, conditioning, mobility, other

-- Kardio → conditioning
UPDATE exercises SET movement_pattern = 'conditioning'
WHERE category = 'Kardio' AND (movement_pattern IS NULL OR movement_pattern = '');

-- Core → core_anti_extension (hlavní core pattern)
UPDATE exercises SET movement_pattern = 'core_anti_extension'
WHERE category = 'Core' AND (movement_pattern IS NULL OR movement_pattern = '');

-- Dolní tělo
UPDATE exercises SET movement_pattern = 'squat'
WHERE category = 'Dolní tělo' 
  AND (movement_pattern IS NULL OR movement_pattern = '')
  AND muscle_groups && ARRAY['quadriceps', 'glutes'];

UPDATE exercises SET movement_pattern = 'hinge'
WHERE category = 'Dolní tělo' 
  AND (movement_pattern IS NULL OR movement_pattern = '')
  AND muscle_groups && ARRAY['hamstrings', 'glutes'];

UPDATE exercises SET movement_pattern = 'lunge'
WHERE category = 'Dolní tělo' 
  AND (movement_pattern IS NULL OR movement_pattern = '');

-- Nohy
UPDATE exercises SET movement_pattern = 'squat'
WHERE category = 'Nohy' AND (movement_pattern IS NULL OR movement_pattern = '');

-- Horní tělo
UPDATE exercises SET movement_pattern = 'push_horizontal'
WHERE category = 'Horní tělo' 
  AND (movement_pattern IS NULL OR movement_pattern = '')
  AND muscle_groups && ARRAY['chest', 'triceps'];

UPDATE exercises SET movement_pattern = 'push_vertical'
WHERE category = 'Horní tělo' 
  AND (movement_pattern IS NULL OR movement_pattern = '')
  AND muscle_groups && ARRAY['shoulders'];

UPDATE exercises SET movement_pattern = 'pull_horizontal'
WHERE category = 'Horní tělo' 
  AND (movement_pattern IS NULL OR movement_pattern = '')
  AND muscle_groups && ARRAY['back', 'lats', 'rhomboids'];

UPDATE exercises SET movement_pattern = 'pull_vertical'
WHERE category = 'Horní tělo' 
  AND (movement_pattern IS NULL OR movement_pattern = '')
  AND muscle_groups && ARRAY['lats'];

UPDATE exercises SET movement_pattern = 'push_horizontal'
WHERE category = 'Horní tělo' AND (movement_pattern IS NULL OR movement_pattern = '');

-- Hrudník
UPDATE exercises SET movement_pattern = 'push_horizontal'
WHERE category = 'Hrudník' AND (movement_pattern IS NULL OR movement_pattern = '');

-- Záda
UPDATE exercises SET movement_pattern = 'pull_horizontal'
WHERE category = 'Záda' AND (movement_pattern IS NULL OR movement_pattern = '');

-- Ramena
UPDATE exercises SET movement_pattern = 'push_vertical'
WHERE category = 'Ramena' AND (movement_pattern IS NULL OR movement_pattern = '');

-- Paže
UPDATE exercises SET movement_pattern = 'pull_horizontal'
WHERE category = 'Paže' 
  AND (movement_pattern IS NULL OR movement_pattern = '')
  AND muscle_groups && ARRAY['biceps'];

UPDATE exercises SET movement_pattern = 'push_horizontal'
WHERE category = 'Paže' 
  AND (movement_pattern IS NULL OR movement_pattern = '')
  AND muscle_groups && ARRAY['triceps'];

UPDATE exercises SET movement_pattern = 'other'
WHERE category = 'Paže' AND (movement_pattern IS NULL OR movement_pattern = '');

-- Carry cviky (jako Farmer Walk)
UPDATE exercises SET movement_pattern = 'carry'
WHERE LOWER(name) LIKE '%carry%' OR LOWER(name) LIKE '%farmer%' OR LOWER(name) LIKE '%walk%suitcase%';

-- Mobility cviky
UPDATE exercises SET movement_pattern = 'mobility'
WHERE category IN ('Mobilita', 'Flexibility') AND (movement_pattern IS NULL OR movement_pattern = '');