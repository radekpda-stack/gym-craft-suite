-- 1. Smazat všechny nepoužívané exercise_* tagy
DELETE FROM tags 
WHERE tag_type IN (
  'exercise_body_part', 
  'exercise_character', 
  'exercise_equipment', 
  'exercise_health', 
  'exercise_pattern', 
  'exercise_performance'
);

-- 2. Přesunout tělesné partie z focus do body_part a nastavit správné barvy
UPDATE tags 
SET tag_type = 'body_part', color = '#8b5cf6'
WHERE name IN ('Hyždě', 'Lýtka', 'Přední stehna', 'Zadní stehna', 'Střed těla', 'Šikmé břišní svalstvo')
  AND tag_type = 'focus';

-- 3. Aktualizovat barvy pro konzistenci podle kategorií
-- body_part = fialová (#8b5cf6)
UPDATE tags SET color = '#8b5cf6' WHERE tag_type = 'body_part';

-- focus = oranžová (#f97316)
UPDATE tags SET color = '#f97316' WHERE tag_type = 'focus';

-- intensity = červená (#ef4444)
UPDATE tags SET color = '#ef4444' WHERE tag_type = 'intensity';

-- goal = zelená (#22c55e)
UPDATE tags SET color = '#22c55e' WHERE tag_type = 'goal';

-- health = růžová (#ec4899)
UPDATE tags SET color = '#ec4899' WHERE tag_type = 'health';

-- status = modrá (#0ea5e9)
UPDATE tags SET color = '#0ea5e9' WHERE tag_type = 'status';

-- business = žlutá (#eab308)
UPDATE tags SET color = '#eab308' WHERE tag_type = 'business';