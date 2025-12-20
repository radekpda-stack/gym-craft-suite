-- Create health_conditions table for autocomplete suggestions
CREATE TABLE public.health_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  category TEXT NOT NULL CHECK (category IN ('disease', 'surgery', 'injury', 'pain', 'allergy')),
  synonyms TEXT[] DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  user_id UUID,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.health_conditions ENABLE ROW LEVEL SECURITY;

-- Users can view all conditions (system + their own)
CREATE POLICY "Users can view all health conditions"
ON public.health_conditions FOR SELECT
USING (is_system = true OR user_id = auth.uid());

-- Users can insert their own conditions
CREATE POLICY "Users can insert their own health conditions"
ON public.health_conditions FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_system = false);

-- Users can update usage_count on any condition they can see
CREATE POLICY "Users can update health conditions"
ON public.health_conditions FOR UPDATE
USING (is_system = true OR user_id = auth.uid());

-- Index for fast text search
CREATE INDEX idx_health_conditions_name ON public.health_conditions(name);
CREATE INDEX idx_health_conditions_category ON public.health_conditions(category);
CREATE INDEX idx_health_conditions_user ON public.health_conditions(user_id);

-- Insert system conditions (diseases)
INSERT INTO public.health_conditions (name, category, is_system, synonyms) VALUES
('Diastáza', 'disease', true, ARRAY['diastaza', 'rozestup břišních svalů']),
('Skolióza', 'disease', true, ARRAY['skolioza', 'zakřivení páteře']),
('Hernie disku', 'disease', true, ARRAY['ploténka', 'výhřez ploténky', 'disk']),
('Vysoký krevní tlak', 'disease', true, ARRAY['hypertenze', 'tlak']),
('Diabetes mellitus', 'disease', true, ARRAY['cukrovka', 'diabetes']),
('Astma', 'disease', true, ARRAY['astma bronchiale']),
('Hypermobilita', 'disease', true, ARRAY['hypermobilní klouby']),
('Osteoporóza', 'disease', true, ARRAY['řídnutí kostí']),
('Artróza', 'disease', true, ARRAY['opotřebení kloubů']),
('Revmatoidní artritida', 'disease', true, ARRAY['revma', 'artritida']),
('Deprese', 'disease', true, ARRAY['depresivní porucha']),
('Úzkostná porucha', 'disease', true, ARRAY['úzkost', 'anxiety']),
('Hypothyreóza', 'disease', true, ARRAY['snížená funkce štítné žlázy']),
('Hyperthyreóza', 'disease', true, ARRAY['zvýšená funkce štítné žlázy']);

-- Insert system conditions (surgeries)
INSERT INTO public.health_conditions (name, category, is_system, synonyms) VALUES
('Operace kolena', 'surgery', true, ARRAY['artroskopie kolena']),
('Plastika ACL', 'surgery', true, ARRAY['přední zkřížený vaz', 'ACL rekonstrukce']),
('Meniskektomie', 'surgery', true, ARRAY['operace menisku']),
('Operace ramene', 'surgery', true, ARRAY['artroskopie ramene']),
('Operace páteře', 'surgery', true, ARRAY['spondylodéza', 'diskektomie']),
('Operace kýly', 'surgery', true, ARRAY['hernioplastika']),
('Císařský řez', 'surgery', true, ARRAY['sectio caesarea', 'C-section']),
('Apendektomie', 'surgery', true, ARRAY['operace slepého střeva']),
('Cholecystektomie', 'surgery', true, ARRAY['operace žlučníku']),
('Operace kyčle', 'surgery', true, ARRAY['TEP kyčle', 'endoprotéza']);

-- Insert system conditions (injuries)
INSERT INTO public.health_conditions (name, category, is_system, synonyms) VALUES
('Zlomenina holeně', 'injury', true, ARRAY['fraktura tibie']),
('Zlomenina stehenní kosti', 'injury', true, ARRAY['fraktura femuru']),
('Zlomenina zápěstí', 'injury', true, ARRAY['fraktura radia']),
('Zlomenina kotníku', 'injury', true, ARRAY['fraktura malleolu']),
('Zlomenina klíční kosti', 'injury', true, ARRAY['fraktura klavikuly']),
('Natržený sval', 'injury', true, ARRAY['svalové natržení', 'ruptura svalu']),
('Výron kotníku', 'injury', true, ARRAY['distorze kotníku', 'podvrtnutý kotník']),
('Vykloubené rameno', 'injury', true, ARRAY['luxace ramene']),
('Ruptura Achillovy šlachy', 'injury', true, ARRAY['přetržená Achillovka']),
('Natažené vazy v koleni', 'injury', true, ARRAY['distorze kolena']),
('Otřes mozku', 'injury', true, ARRAY['kontuze mozku']);

-- Insert system conditions (pain)
INSERT INTO public.health_conditions (name, category, is_system, synonyms) VALUES
('Bolest v kříži', 'pain', true, ARRAY['lumbalgie', 'bolest bederní páteře', 'low back pain']),
('Bolest krční páteře', 'pain', true, ARRAY['cervikalgie', 'bolest šíje']),
('Bolest kolen', 'pain', true, ARRAY['gonalgie']),
('Bolest ramen', 'pain', true, ARRAY['omalgie']),
('Bolest hlavy', 'pain', true, ARRAY['cefalea']),
('Migréna', 'pain', true, ARRAY['migrena']),
('Bolest hrudní páteře', 'pain', true, ARRAY['torakalgie', 'bolest mezi lopatkami']),
('Bolest kyčle', 'pain', true, ARRAY['koxalgie']),
('Bolest loktu', 'pain', true, ARRAY['epikondylitida', 'tenisový loket']);

-- Insert system conditions (allergies)
INSERT INTO public.health_conditions (name, category, is_system, synonyms) VALUES
('Pylová alergie', 'allergy', true, ARRAY['senná rýma', 'pollinóza']),
('Potravinová alergie', 'allergy', true, ARRAY['alergie na potraviny']),
('Intolerance laktózy', 'allergy', true, ARRAY['laktózová intolerance']),
('Celiakie', 'allergy', true, ARRAY['intolerance lepku', 'glutenová enteropatie']),
('Alergie na ořechy', 'allergy', true, ARRAY['oříšky']),
('Alergie na mořské plody', 'allergy', true, ARRAY['korýši', 'měkkýši']),
('Alergie na roztoče', 'allergy', true, ARRAY['prachová alergie']),
('Alergie na zvířata', 'allergy', true, ARRAY['kočky', 'psi']);