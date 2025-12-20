-- Rozšíření tabulky tags o nové sloupce pro profesionální správu tagů
-- Tag types: focus, body_part, intensity, goal, health, status, business

-- Přidání nových sloupců
ALTER TABLE public.tags 
ADD COLUMN IF NOT EXISTS tag_type TEXT DEFAULT 'focus',
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS affects_load BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS affects_credit BOOLEAN DEFAULT true;

-- Vytvoření indexu pro rychlé filtrování podle typu
CREATE INDEX IF NOT EXISTS idx_tags_tag_type ON public.tags(tag_type);
CREATE INDEX IF NOT EXISTS idx_tags_is_system ON public.tags(is_system);

-- Migrace existujících tagů - přiřazení správných typů podle názvu
UPDATE public.tags SET tag_type = 'body_part', affects_load = true WHERE LOWER(name) IN ('horní část', 'dolní část', 'core', 'celé tělo', 'záda', 'ramena', 'nohy', 'ruce', 'hrudník');
UPDATE public.tags SET tag_type = 'focus', affects_load = true WHERE LOWER(name) IN ('síla', 'mobilita', 'kardio', 'hypertrofie', 'vytrvalost', 'flexibilita');
UPDATE public.tags SET tag_type = 'intensity', affects_load = true WHERE LOWER(name) IN ('lehký', 'střední', 'těžký', 'regenerace', 'light', 'medium', 'heavy');
UPDATE public.tags SET tag_type = 'goal', affects_load = true WHERE LOWER(name) IN ('hubnutí', 'nabírání', 'výkon', 'zdraví', 'rehabilitace');
UPDATE public.tags SET tag_type = 'health', affects_load = false WHERE LOWER(name) LIKE '%bolest%' OR LOWER(name) LIKE '%zranění%' OR LOWER(name) LIKE '%rehab%';

-- Tagy typu Regenerace a Mobilita nezvyšují zátěž
UPDATE public.tags SET affects_load = false WHERE LOWER(name) IN ('regenerace', 'mobilita', 'strečink', 'recovery');

-- Vytvoření systémových tagů pro základní kategorie (pokud neexistují)
INSERT INTO public.tags (name, color, tag_type, is_system, affects_load, affects_credit, user_id)
SELECT 'Síla', '#ef4444', 'focus', true, true, true, user_id
FROM public.tags 
WHERE user_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM public.tags t2 WHERE t2.name = 'Síla' AND t2.user_id = public.tags.user_id)
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.tags (name, color, tag_type, is_system, affects_load, affects_credit, user_id)
SELECT 'Mobilita', '#3b82f6', 'focus', true, false, true, user_id
FROM public.tags 
WHERE user_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM public.tags t2 WHERE t2.name = 'Mobilita' AND t2.user_id = public.tags.user_id)
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.tags (name, color, tag_type, is_system, affects_load, affects_credit, user_id)
SELECT 'Kardio', '#22c55e', 'focus', true, true, true, user_id
FROM public.tags 
WHERE user_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM public.tags t2 WHERE t2.name = 'Kardio' AND t2.user_id = public.tags.user_id)
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.tags (name, color, tag_type, is_system, affects_load, affects_credit, user_id)
SELECT 'Horní část', '#8b5cf6', 'body_part', true, true, true, user_id
FROM public.tags 
WHERE user_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM public.tags t2 WHERE t2.name = 'Horní část' AND t2.user_id = public.tags.user_id)
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.tags (name, color, tag_type, is_system, affects_load, affects_credit, user_id)
SELECT 'Dolní část', '#f59e0b', 'body_part', true, true, true, user_id
FROM public.tags 
WHERE user_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM public.tags t2 WHERE t2.name = 'Dolní část' AND t2.user_id = public.tags.user_id)
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.tags (name, color, tag_type, is_system, affects_load, affects_credit, user_id)
SELECT 'Core', '#06b6d4', 'body_part', true, true, true, user_id
FROM public.tags 
WHERE user_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM public.tags t2 WHERE t2.name = 'Core' AND t2.user_id = public.tags.user_id)
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.tags (name, color, tag_type, is_system, affects_load, affects_credit, user_id)
SELECT 'Lehký', '#84cc16', 'intensity', true, false, true, user_id
FROM public.tags 
WHERE user_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM public.tags t2 WHERE t2.name = 'Lehký' AND t2.user_id = public.tags.user_id)
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.tags (name, color, tag_type, is_system, affects_load, affects_credit, user_id)
SELECT 'Střední', '#eab308', 'intensity', true, true, true, user_id
FROM public.tags 
WHERE user_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM public.tags t2 WHERE t2.name = 'Střední' AND t2.user_id = public.tags.user_id)
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.tags (name, color, tag_type, is_system, affects_load, affects_credit, user_id)
SELECT 'Těžký', '#dc2626', 'intensity', true, true, true, user_id
FROM public.tags 
WHERE user_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM public.tags t2 WHERE t2.name = 'Těžký' AND t2.user_id = public.tags.user_id)
LIMIT 1
ON CONFLICT DO NOTHING;

-- Přidání komentářů pro dokumentaci
COMMENT ON COLUMN public.tags.tag_type IS 'Typ tagu: focus, body_part, intensity, goal, health, status, business';
COMMENT ON COLUMN public.tags.is_system IS 'Systémové tagy nelze smazat';
COMMENT ON COLUMN public.tags.affects_load IS 'Zda tag ovlivňuje tréninkovou zátěž';
COMMENT ON COLUMN public.tags.affects_credit IS 'Zda tag ovlivňuje kredit klienta';