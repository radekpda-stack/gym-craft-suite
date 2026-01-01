-- Create test_definitions table
CREATE TABLE public.test_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  name_cs TEXT,
  category TEXT NOT NULL CHECK (category IN ('cardio', 'strength', 'endurance', 'grip_core', 'mobility')),
  linked_exercise_id UUID REFERENCES public.exercises(id),
  device_family TEXT CHECK (device_family IN ('SkillRow', 'SkillUp', 'SkillRun', NULL)),
  
  -- Primary metric
  primary_metric_key TEXT NOT NULL,
  primary_metric_better TEXT NOT NULL CHECK (primary_metric_better IN ('lower_is_better', 'higher_is_better')),
  
  -- Protocol & Instructions
  protocol_text TEXT,
  how_to_steps JSONB DEFAULT '[]',
  standardization_checklist JSONB DEFAULT '[]',
  equipment_setup JSONB DEFAULT '{}',
  common_mistakes JSONB DEFAULT '[]',
  validity_rules JSONB DEFAULT '[]',
  
  -- Metrics schema
  required_metrics_schema JSONB NOT NULL DEFAULT '{}',
  optional_metrics_schema JSONB DEFAULT '{}',
  scoring_rules JSONB DEFAULT '{}',
  
  -- Scheduling
  recommended_frequency_days INTEGER DEFAULT 28,
  comparability_rules_json JSONB DEFAULT '{}',
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create test_sessions table
CREATE TABLE public.test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  test_definition_id UUID REFERENCES public.test_definitions(id) NOT NULL,
  client_id UUID REFERENCES public.clients(id) NOT NULL,
  date_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Results
  metrics_json JSONB NOT NULL DEFAULT '{}',
  splits_json JSONB,
  
  -- Machine settings (for Skill* tests)
  machine_settings_json JSONB,
  
  -- Warmup (client-specific)
  warmup_done BOOLEAN NOT NULL DEFAULT false,
  warmup_type TEXT[] DEFAULT '{}',
  warmup_notes TEXT,
  
  -- Quality & Validity
  is_valid BOOLEAN NOT NULL DEFAULT true,
  invalid_reason TEXT,
  quality_rating_1_5 INTEGER CHECK (quality_rating_1_5 BETWEEN 1 AND 5),
  rpe_1_10 INTEGER CHECK (rpe_1_10 BETWEEN 1 AND 10),
  
  -- Comparable
  is_comparable BOOLEAN NOT NULL DEFAULT true,
  non_comparable_reason TEXT,
  
  -- Additional
  notes TEXT,
  environment_json JSONB,
  attachments TEXT[],
  
  -- Auto-generated exercise entry reference
  exercise_entry_id UUID REFERENCES public.exercise_entries(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.test_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;

-- RLS for test_definitions: public read, owner write
CREATE POLICY "Anyone can view active test definitions" 
  ON public.test_definitions FOR SELECT 
  USING (is_active = true OR user_id = auth.uid());

CREATE POLICY "Users can insert own test definitions" 
  ON public.test_definitions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own test definitions" 
  ON public.test_definitions FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own test definitions" 
  ON public.test_definitions FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS for test_sessions: owner only
CREATE POLICY "Users can view own test sessions" 
  ON public.test_sessions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own test sessions" 
  ON public.test_sessions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own test sessions" 
  ON public.test_sessions FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own test sessions" 
  ON public.test_sessions FOR DELETE 
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_test_sessions_client_id ON public.test_sessions(client_id);
CREATE INDEX idx_test_sessions_test_definition_id ON public.test_sessions(test_definition_id);
CREATE INDEX idx_test_sessions_date_time ON public.test_sessions(date_time DESC);
CREATE INDEX idx_test_definitions_category ON public.test_definitions(category);

-- Seed test definitions (system defaults with user_id = NULL)
INSERT INTO public.test_definitions (
  user_id, name, name_cs, category, device_family, 
  primary_metric_key, primary_metric_better,
  protocol_text, how_to_steps, standardization_checklist,
  common_mistakes, validity_rules, required_metrics_schema, optional_metrics_schema,
  recommended_frequency_days, comparability_rules_json
) VALUES
-- SkillRow 500m TT
(NULL, 'SkillRow 500m TT', 'SkillRow 500m časovka', 'cardio', 'SkillRow',
 'time_s', 'lower_is_better',
 'Maximální výkon na 500 metrů na veslovacím trenažéru SkillRow.',
 '["Nastav odpor podle protokolu", "Sedni na trenažér, připni nohy", "Začni veslovat na pokyn", "Udržuj maximální tempo po celou vzdálenost", "Po dokončení zaznamenej čas"]',
 '["Nohy pevně připnuty", "Správná výška sedátka", "Odpor nastaven dle protokolu", "Displej resetován na 0m"]',
 '["Příliš vysoké tempo na začátku", "Špatná technika tahu", "Nedotažení tahů", "Předčasné vzdání"]',
 '["Klient přerušil test", "Bolest během testu", "Technické problémy s trenažérem", "Nedodržen stanovený odpor"]',
 '{"distance_m": {"type": "number", "label": "Vzdálenost (m)", "default": 500, "readonly": true}, "time_s": {"type": "number", "label": "Čas (s)", "required": true}}',
 '{"avg_hr": {"type": "number", "label": "Prům. TF"}, "max_hr": {"type": "number", "label": "Max TF"}, "avg_power_w": {"type": "number", "label": "Prům. výkon (W)"}, "spm": {"type": "number", "label": "Tempo (SPM)"}}',
 28,
 '{"requires_same_resistance": true, "requires_same_device_family": true}'
),
-- SkillRow 2000m TT
(NULL, 'SkillRow 2000m TT', 'SkillRow 2000m časovka', 'cardio', 'SkillRow',
 'time_s', 'lower_is_better',
 'Maximální výkon na 2000 metrů na veslovacím trenažéru SkillRow. Zaznamenávej mezičasy po 500m.',
 '["Nastav odpor podle protokolu", "Připrav se na delší zátěž", "Rozděl síly rovnoměrně", "Zaznamenej mezičasy po každých 500m", "Finišuj posledních 250m"]',
 '["Nohy pevně připnuty", "Správná výška sedátka", "Odpor nastaven dle protokolu", "Láhev s vodou připravena", "Displej resetován"]',
 '["Příliš rychlý začátek", "Nerovnoměrné rozložení sil", "Kolaps v druhé polovině", "Špatné dýchání"]',
 '["Klient přerušil test", "Bolest během testu", "Výrazný pokles výkonu (>20%)", "Nedodržen odpor"]',
 '{"distance_m": {"type": "number", "label": "Vzdálenost (m)", "default": 2000, "readonly": true}, "time_s": {"type": "number", "label": "Celkový čas (s)", "required": true}, "splits_required": true}',
 '{"avg_hr": {"type": "number", "label": "Prům. TF"}, "max_hr": {"type": "number", "label": "Max TF"}, "avg_power_w": {"type": "number", "label": "Prům. výkon (W)"}, "spm": {"type": "number", "label": "Tempo (SPM)"}}',
 56,
 '{"requires_same_resistance": true, "requires_same_device_family": true}'
),
-- SkillRun 5km TT
(NULL, 'SkillRun 5km TT', 'SkillRun 5km časovka', 'cardio', 'SkillRun',
 'time_s', 'lower_is_better',
 'Maximální výkon na 5 km na běžeckém pásu SkillRun.',
 '["Nastav sklon podle protokolu (1-15%)", "Rozběhni se do cílové rychlosti", "Udržuj konstantní tempo", "Posledních 500m můžeš zrychlit", "Zaznamenej celkový čas"]',
 '["Sklon nastaven dle protokolu", "Bezpečnostní klip připnut", "Displej resetován", "Voda připravena"]',
 '["Příliš rychlý rozběh", "Držení se madel", "Nesprávný došlap", "Přehřátí"]',
 '["Klient přerušil test", "Bolest během testu", "Pád z pásu", "Nevolnost"]',
 '{"distance_m": {"type": "number", "label": "Vzdálenost (m)", "default": 5000, "readonly": true}, "time_s": {"type": "number", "label": "Čas (s)", "required": true}, "incline_pct": {"type": "number", "label": "Sklon (%)", "min": 1, "max": 15, "default": 1, "required": true}}',
 '{"avg_hr": {"type": "number", "label": "Prům. TF"}, "max_hr": {"type": "number", "label": "Max TF"}}',
 42,
 '{"requires_same_incline": true, "incline_tolerance": 0.5, "requires_same_device_family": true}'
),
-- AeT 30min test
(NULL, 'AeT 30min test', 'AeT 30min konstantní zátěž', 'endurance', NULL,
 'hr_drift', 'lower_is_better',
 'Test aerobního prahu - 30 minut konstantní zátěže. Měř průměrnou TF a tempo/výkon v první a poslední třetině.',
 '["Rozcvič se 10-15 minut", "Nastav konstantní tempo/výkon", "Udržuj stejnou intenzitu 30 minut", "Zaznamenej TF a tempo po 10 a po 30 minutách"]',
 '["Klidová TF změřena před testem", "Konstantní teplota v místnosti", "Bez přerušení po celou dobu"]',
 '["Změna tempa během testu", "Přestávky", "Příliš vysoká počáteční intenzita"]',
 '["Test přerušen", "TF vyšší než AeT od začátku", "Významná změna tempa"]',
 '{"duration_s": {"type": "number", "label": "Doba (s)", "default": 1800, "readonly": true}, "avg_hr_first_10m": {"type": "number", "label": "Prům. TF 0-10min", "required": true}, "avg_hr_last_10m": {"type": "number", "label": "Prům. TF 20-30min", "required": true}, "avg_pace_first_10m": {"type": "number", "label": "Prům. tempo/výkon 0-10min", "required": true}, "avg_pace_last_10m": {"type": "number", "label": "Prům. tempo/výkon 20-30min", "required": true}}',
 '{}',
 21,
 '{"requires_same_resistance": true, "requires_same_incline": true}'
),
-- Mobility: Knee-to-wall
(NULL, 'Knee-to-wall dorsiflexe', 'K2W dorsální flexe kotníku', 'mobility', NULL,
 'avg_cm', 'higher_is_better',
 'Test rozsahu dorsální flexe kotníku metodou knee-to-wall.',
 '["Postav se čelem ke zdi", "Palec nohy se dotýká zdi", "Ohýbej koleno směrem ke zdi", "Pata musí zůstat na zemi", "Měř vzdálenost palce od zdi v cm"]',
 '["Bos nebo ponožky", "Rovný povrch", "Pata na zemi po celou dobu"]',
 '["Zvedání paty", "Rotace kolena dovnitř", "Přesouvání váhy na druhou nohu"]',
 '["Bolest v kotníku", "Nemožnost dosáhnout zdi s patou na zemi"]',
 '{"L_value": {"type": "number", "label": "Levá (cm)", "required": true}, "R_value": {"type": "number", "label": "Pravá (cm)", "required": true}, "L_score_0_5": {"type": "number", "label": "Skóre L (0-5)", "min": 0, "max": 5, "required": true}, "R_score_0_5": {"type": "number", "label": "Skóre R (0-5)", "min": 0, "max": 5, "required": true}, "unit": {"type": "string", "default": "cm", "readonly": true}}',
 '{}',
 14,
 '{"always_comparable": true}'
),
-- Mobility: SLR
(NULL, 'Straight Leg Raise', 'SLR test hamstringů', 'mobility', NULL,
 'avg_deg', 'higher_is_better',
 'Test flexibility hamstringů metodou straight leg raise.',
 '["Leh na záda, nohy natažené", "Zvedni jednu nohu s propnutým kolenem", "Druhá noha zůstává na zemi", "Měř úhel v kyčli pomocí goniometru"]',
 '["Koleno zvedané nohy propnuté", "Druhá noha na zemi", "Pánev neutrální"]',
 '["Pokrčení kolena", "Zvedání druhé nohy", "Rotace pánve"]',
 '["Bolest v kříži", "Bolest v hamstringu"]',
 '{"L_value": {"type": "number", "label": "Levá (°)", "required": true}, "R_value": {"type": "number", "label": "Pravá (°)", "required": true}, "L_score_0_5": {"type": "number", "label": "Skóre L (0-5)", "min": 0, "max": 5, "required": true}, "R_score_0_5": {"type": "number", "label": "Skóre R (0-5)", "min": 0, "max": 5, "required": true}, "unit": {"type": "string", "default": "deg", "readonly": true}}',
 '{}',
 14,
 '{"always_comparable": true}'
),
-- Mobility: 90/90 Hip IR
(NULL, '90/90 Hip IR', '90/90 vnitřní rotace kyčle', 'mobility', NULL,
 'avg_deg', 'higher_is_better',
 'Test vnitřní rotace kyčle v pozici 90/90.',
 '["Sed na židli, kolena v 90°", "Rotuj bérec dovnitř (IR)", "Měř úhel rotace goniometrem"]',
 '["Kyčle a kolena v 90°", "Pánev stabilní", "Sed vzpřímený"]',
 '["Náklon trupu", "Zvedání pánve", "Kompenzace v páteři"]',
 '["Bolest v kyčli", "Bolest v koleni"]',
 '{"L_value": {"type": "number", "label": "Levá (°)", "required": true}, "R_value": {"type": "number", "label": "Pravá (°)", "required": true}, "L_score_0_5": {"type": "number", "label": "Skóre L (0-5)", "min": 0, "max": 5, "required": true}, "R_score_0_5": {"type": "number", "label": "Skóre R (0-5)", "min": 0, "max": 5, "required": true}, "unit": {"type": "string", "default": "deg", "readonly": true}}',
 '{}',
 14,
 '{"always_comparable": true}'
),
-- Mobility: Shoulder flexion
(NULL, 'Shoulder Flexion Wall', 'Flexe ramene u zdi', 'mobility', NULL,
 'avg_deg', 'higher_is_better',
 'Test rozsahu flexe ramene u zdi.',
 '["Stoj zády ke zdi, záda přitisknuta", "Zvedni paže nad hlavu podél zdi", "Měř úhel mezi paží a trupem"]',
 '["Záda a hlava u zdi", "Paže propnuté", "Bez prohnutí beder"]',
 '["Prohnutí beder", "Pokrčení loktů", "Odlepení zad od zdi"]',
 '["Bolest v rameni", "Bolest v krční páteři"]',
 '{"L_value": {"type": "number", "label": "Levá (°)", "required": true}, "R_value": {"type": "number", "label": "Pravá (°)", "required": true}, "L_score_0_5": {"type": "number", "label": "Skóre L (0-5)", "min": 0, "max": 5, "required": true}, "R_score_0_5": {"type": "number", "label": "Skóre R (0-5)", "min": 0, "max": 5, "required": true}, "unit": {"type": "string", "default": "deg", "readonly": true}}',
 '{}',
 14,
 '{"always_comparable": true}'
),
-- Mobility: Deep squat hold
(NULL, 'Deep Squat Hold', 'Hluboký dřep - výdrž', 'mobility', NULL,
 'score_0_5', 'higher_is_better',
 'Test kvality hlubokého dřepu s výdrží.',
 '["Postav se s nohama na šíři ramen", "Sestouj do hlubokého dřepu", "Drž pozici co nejdéle", "Hodnoť kvalitu pozice (0-5)"]',
 '["Paty na zemi", "Kolena nad špičkami", "Vzpřímený trup", "Paže před tělem"]',
 '["Zvedání pat", "Kolena dovnitř", "Předklon trupu", "Ztráta rovnováhy"]',
 '["Bolest v kolenou", "Bolest v kyčlích", "Nemožnost dosáhnout plné hloubky"]',
 '{"time_s": {"type": "number", "label": "Čas výdrže (s)", "required": true}, "score_0_5": {"type": "number", "label": "Skóre kvality (0-5)", "min": 0, "max": 5, "required": true}}',
 '{}',
 14,
 '{"always_comparable": true}'
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_test_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_test_definitions_updated_at
  BEFORE UPDATE ON public.test_definitions
  FOR EACH ROW EXECUTE FUNCTION update_test_tables_updated_at();

CREATE TRIGGER update_test_sessions_updated_at
  BEFORE UPDATE ON public.test_sessions
  FOR EACH ROW EXECUTE FUNCTION update_test_tables_updated_at();