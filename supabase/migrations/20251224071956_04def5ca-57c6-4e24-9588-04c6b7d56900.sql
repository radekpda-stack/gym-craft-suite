-- Rozšíření tabulky exercises o nové sloupce pro modul cviků
-- Typ cviku (strength / cardio / mixed)
ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS exercise_type_v2 text DEFAULT 'strength' CHECK (exercise_type_v2 IN ('strength', 'cardio', 'mixed'));

-- Prostředí cvičení
ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS environment text DEFAULT 'gym' CHECK (environment IN ('gym', 'outdoor', 'home', 'treadmill', 'rower', 'skillup', 'any'));

-- Podporované metriky (array)
ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS supported_metrics text[] DEFAULT ARRAY['weight', 'reps', 'sets']::text[];

-- Úroveň rizika
ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS risk_level text DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high'));

-- Subjektivní náročnost (1-5)
ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS subjective_difficulty integer DEFAULT 3 CHECK (subjective_difficulty >= 1 AND subjective_difficulty <= 5);

-- Doporučená doba regenerace v hodinách
ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS recovery_hours integer DEFAULT 48 CHECK (recovery_hours >= 0 AND recovery_hours <= 168);

-- Kumulace únavy (low/medium/high)
ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS fatigue_accumulation text DEFAULT 'medium' CHECK (fatigue_accumulation IN ('low', 'medium', 'high'));

-- Kontraindikace - části těla
ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS contraindicated_areas text[] DEFAULT ARRAY[]::text[];

-- Vyžaduje technický dohled
ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS requires_supervision boolean DEFAULT false;

-- Komentář k riziku
ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS risk_notes text;

-- Poznámky trenéra specifické ke cviku
ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS trainer_notes text;