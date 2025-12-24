-- Přidání unikátního constraintu pro exercise_tag_map (pro upsert)
ALTER TABLE exercise_tag_map 
DROP CONSTRAINT IF EXISTS exercise_tag_map_unique;

ALTER TABLE exercise_tag_map 
ADD CONSTRAINT exercise_tag_map_unique UNIQUE (exercise_id, tag_id);