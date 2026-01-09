-- Odstranit duplicitní tagy ze Zaměření (jsou již v Typu tréninku)
DELETE FROM tags WHERE tag_type = 'focus' AND name IN ('Kardio', 'Kondice', 'Mobilita');

-- Přejmenovat Síla na Max síla (odlišení od typu tréninku)
UPDATE tags SET name = 'Max síla' WHERE tag_type = 'focus' AND name = 'Síla';

-- Přidat nové tagy Zaměření
INSERT INTO tags (name, tag_type, color, user_id, affects_load, affects_credit)
VALUES 
  ('Vytrvalost', 'focus', '#f97316', 'ec31b7f8-001f-4fb4-8dc4-b7bb8be9311b', true, true),
  ('Core', 'focus', '#f97316', 'ec31b7f8-001f-4fb4-8dc4-b7bb8be9311b', true, true);

-- Odstranit Regenerace z Intenzita (je již v Typu tréninku)
DELETE FROM tags WHERE tag_type = 'intensity' AND name = 'Regenerace';