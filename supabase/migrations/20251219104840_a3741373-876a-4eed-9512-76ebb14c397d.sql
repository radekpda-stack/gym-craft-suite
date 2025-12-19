-- Přidat nové sloupce pro vylepšený feedback systém
ALTER TABLE public.training_feedback 
ADD COLUMN IF NOT EXISTS pain_type text CHECK (pain_type IN ('muscle', 'joint')),
ADD COLUMN IF NOT EXISTS sleep_after text CHECK (sleep_after IN ('poor', 'average', 'good'));

-- Komentáře pro dokumentaci
COMMENT ON COLUMN public.training_feedback.pain_type IS 'Typ bolesti: muscle = svalová/únava, joint = kloub/šlacha/ostrá';
COMMENT ON COLUMN public.training_feedback.sleep_after IS 'Kvalita spánku po tréninku: poor/average/good';