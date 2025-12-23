-- Přesunout "Hyzdě" (s překlepem) do body_part
UPDATE tags 
SET tag_type = 'body_part', color = '#8b5cf6'
WHERE name = 'Hyzdě' AND tag_type = 'focus';