-- Add SkullUp2 test definitions with same metrics as SkillRow
INSERT INTO test_definitions (
  name, name_cs, category, device_family,
  protocol_text, how_to_steps, standardization_checklist, common_mistakes, validity_rules,
  primary_metric_key, primary_metric_better, recommended_frequency_days,
  required_metrics_schema, optional_metrics_schema, comparability_rules_json, is_active
) VALUES
(
  'SkullUp2 500m TT',
  'SkullUp2 500m časovka',
  'endurance',
  'SkullUp2',
  'Veslařský test na 500 metrů na čas na trenažéru SkullUp2.',
  '["Rozcvič se 5-10 minut", "Nastav vzdálenost 500m", "Start z klidu", "Vesluj maximálním úsilím", "Zaznamenej čas a metriky"]'::jsonb,
  '["Damper nastavení zaznamenáno", "Klidová TF před testem", "Stejné podmínky prostředí"]'::jsonb,
  '["Příliš vysoké tempo na začátku", "Špatná technika záběru", "Nedostatečný rozcvik"]'::jsonb,
  '["Test přerušen", "Technická závada trenažéru"]'::jsonb,
  'time_s',
  'lower_is_better',
  14,
  '{"distance_m": {"type": "number", "label": "Vzdálenost (m)", "default": 500, "readonly": true}, "time_s": {"type": "number", "label": "Čas (s)", "required": true}}'::jsonb,
  '{"avg_power_w": {"type": "number", "label": "Prům. výkon (W)"}, "spm": {"type": "number", "label": "Tempo (SPM)"}, "avg_hr": {"type": "number", "label": "Prům. TF"}, "max_hr": {"type": "number", "label": "Max TF"}, "drag_factor": {"type": "number", "label": "Drag Factor"}}'::jsonb,
  '{"requires_same_device": true}'::jsonb,
  true
),
(
  'SkullUp2 1000m TT',
  'SkullUp2 1000m časovka',
  'endurance',
  'SkullUp2',
  'Veslařský test na 1000 metrů na čas na trenažéru SkullUp2.',
  '["Rozcvič se 5-10 minut", "Nastav vzdálenost 1000m", "Start z klidu", "Vesluj kontrolovaným tempem", "Zaznamenej čas a metriky"]'::jsonb,
  '["Damper nastavení zaznamenáno", "Klidová TF před testem", "Stejné podmínky prostředí"]'::jsonb,
  '["Příliš rychlý start", "Nerovnoměrné tempo", "Špatná technika"]'::jsonb,
  '["Test přerušen", "Technická závada trenažéru"]'::jsonb,
  'time_s',
  'lower_is_better',
  14,
  '{"distance_m": {"type": "number", "label": "Vzdálenost (m)", "default": 1000, "readonly": true}, "time_s": {"type": "number", "label": "Čas (s)", "required": true}}'::jsonb,
  '{"avg_power_w": {"type": "number", "label": "Prům. výkon (W)"}, "spm": {"type": "number", "label": "Tempo (SPM)"}, "avg_hr": {"type": "number", "label": "Prům. TF"}, "max_hr": {"type": "number", "label": "Max TF"}, "drag_factor": {"type": "number", "label": "Drag Factor"}}'::jsonb,
  '{"requires_same_device": true}'::jsonb,
  true
),
(
  'SkullUp2 2000m TT',
  'SkullUp2 2000m časovka',
  'endurance',
  'SkullUp2',
  'Veslařský test na 2000 metrů na čas na trenažéru SkullUp2. Klasický benchmark vytrvalosti.',
  '["Rozcvič se 10-15 minut", "Nastav vzdálenost 2000m", "Start z klidu", "Rozlož síly na celou vzdálenost", "Zaznamenej čas, splits a metriky"]'::jsonb,
  '["Damper nastavení zaznamenáno", "Klidová TF před testem", "Stejné podmínky prostředí", "Bez přerušení"]'::jsonb,
  '["Příliš agresivní první 500m", "Propad v druhém kilometru", "Špatné dýchání"]'::jsonb,
  '["Test přerušen", "Technická závada trenažéru"]'::jsonb,
  'time_s',
  'lower_is_better',
  21,
  '{"distance_m": {"type": "number", "label": "Vzdálenost (m)", "default": 2000, "readonly": true}, "time_s": {"type": "number", "label": "Celkový čas (s)", "required": true}, "splits_required": true}'::jsonb,
  '{"avg_power_w": {"type": "number", "label": "Prům. výkon (W)"}, "spm": {"type": "number", "label": "Tempo (SPM)"}, "avg_hr": {"type": "number", "label": "Prům. TF"}, "max_hr": {"type": "number", "label": "Max TF"}, "drag_factor": {"type": "number", "label": "Drag Factor"}}'::jsonb,
  '{"requires_same_device": true}'::jsonb,
  true
);

-- Update SkillRun with more running-specific metrics (VO2max, watts, cadence, etc.)
UPDATE test_definitions 
SET optional_metrics_schema = '{
  "avg_hr": {"type": "number", "label": "Prům. TF"},
  "max_hr": {"type": "number", "label": "Max TF"},
  "avg_power_w": {"type": "number", "label": "Prům. výkon (W)"},
  "vo2max_estimated": {"type": "number", "label": "Odhadované VO2max (ml/kg/min)"},
  "avg_cadence_spm": {"type": "number", "label": "Prům. kadence (SPM)"},
  "max_speed_kmh": {"type": "number", "label": "Max rychlost (km/h)"},
  "avg_speed_kmh": {"type": "number", "label": "Prům. rychlost (km/h)"},
  "calories_kcal": {"type": "number", "label": "Spálené kalorie (kcal)"},
  "elevation_gain_m": {"type": "number", "label": "Převýšení (m)"},
  "ground_contact_time_ms": {"type": "number", "label": "Doba kontaktu (ms)"},
  "vertical_oscillation_cm": {"type": "number", "label": "Vertikální oscilace (cm)"}
}'::jsonb
WHERE device_family = 'SkillRun';

-- Add more SkillRun test variants
INSERT INTO test_definitions (
  name, name_cs, category, device_family,
  protocol_text, how_to_steps, standardization_checklist, common_mistakes, validity_rules,
  primary_metric_key, primary_metric_better, recommended_frequency_days,
  required_metrics_schema, optional_metrics_schema, comparability_rules_json, is_active
) VALUES
(
  'SkillRun 1km TT',
  'SkillRun 1km časovka',
  'endurance',
  'SkillRun',
  'Běžecký test na 1 km na čas na běžeckém pásu SkillRun.',
  '["Rozcvič se 10 minut", "Nastav sklon 1%", "Nastav vzdálenost 1000m", "Běž maximálním úsilím", "Zaznamenej čas a metriky"]'::jsonb,
  '["Sklon 1% (simulace odporu vzduchu)", "Klidová TF před testem", "Běžecká obuv"]'::jsonb,
  '["Příliš rychlý start", "Držení se madel", "Nedostatečný rozcvik"]'::jsonb,
  '["Test přerušen", "Držení madel během testu"]'::jsonb,
  'time_s',
  'lower_is_better',
  14,
  '{"distance_m": {"type": "number", "label": "Vzdálenost (m)", "default": 1000, "readonly": true}, "time_s": {"type": "number", "label": "Čas (s)", "required": true}, "incline_pct": {"type": "number", "label": "Sklon (%)", "default": 1, "min": 0, "max": 15, "required": true}}'::jsonb,
  '{"avg_hr": {"type": "number", "label": "Prům. TF"}, "max_hr": {"type": "number", "label": "Max TF"}, "avg_power_w": {"type": "number", "label": "Prům. výkon (W)"}, "vo2max_estimated": {"type": "number", "label": "Odhadované VO2max (ml/kg/min)"}, "avg_cadence_spm": {"type": "number", "label": "Prům. kadence (SPM)"}, "max_speed_kmh": {"type": "number", "label": "Max rychlost (km/h)"}, "avg_speed_kmh": {"type": "number", "label": "Prům. rychlost (km/h)"}, "calories_kcal": {"type": "number", "label": "Spálené kalorie (kcal)"}}'::jsonb,
  '{"requires_same_incline": true}'::jsonb,
  true
),
(
  'SkillRun 10km TT',
  'SkillRun 10km časovka',
  'endurance',
  'SkillRun',
  'Běžecký test na 10 km na čas na běžeckém pásu SkillRun. Klasický vytrvalostní benchmark.',
  '["Důkladný rozcvik 15-20 minut", "Nastav sklon 1%", "Nastav vzdálenost 10000m", "Rozlož síly rovnoměrně", "Zaznamenej čas, splits a metriky"]'::jsonb,
  '["Sklon 1%", "Hydratace před testem", "Klidová TF", "Běžecká obuv"]'::jsonb,
  '["Příliš rychlý první kilometr", "Dehydratace", "Nerovnoměrné tempo"]'::jsonb,
  '["Test přerušen", "Držení madel", "Dehydratace"]'::jsonb,
  'time_s',
  'lower_is_better',
  28,
  '{"distance_m": {"type": "number", "label": "Vzdálenost (m)", "default": 10000, "readonly": true}, "time_s": {"type": "number", "label": "Čas (s)", "required": true}, "incline_pct": {"type": "number", "label": "Sklon (%)", "default": 1, "min": 0, "max": 15, "required": true}, "splits_required": true}'::jsonb,
  '{"avg_hr": {"type": "number", "label": "Prům. TF"}, "max_hr": {"type": "number", "label": "Max TF"}, "avg_power_w": {"type": "number", "label": "Prům. výkon (W)"}, "vo2max_estimated": {"type": "number", "label": "Odhadované VO2max (ml/kg/min)"}, "avg_cadence_spm": {"type": "number", "label": "Prům. kadence (SPM)"}, "max_speed_kmh": {"type": "number", "label": "Max rychlost (km/h)"}, "avg_speed_kmh": {"type": "number", "label": "Prům. rychlost (km/h)"}, "calories_kcal": {"type": "number", "label": "Spálené kalorie (kcal)"}, "elevation_gain_m": {"type": "number", "label": "Převýšení (m)"}}'::jsonb,
  '{"requires_same_incline": true}'::jsonb,
  true
),
(
  'SkillRun Cooper Test',
  'SkillRun Cooperův test',
  'endurance',
  'SkillRun',
  '12minutový Cooperův test - běž co nejdále za 12 minut. Klasický test aerobní zdatnosti.',
  '["Rozcvik 10-15 minut", "Nastav sklon 1%", "Nastav čas 12 minut", "Běž co nejdále", "Zaznamenej vzdálenost"]'::jsonb,
  '["Sklon 1%", "Přesně 12 minut", "Klidová TF před testem"]'::jsonb,
  '["Příliš rychlý start", "Nerovnoměrné tempo", "Vzdání před časem"]'::jsonb,
  '["Test přerušen před 12 min", "Držení madel"]'::jsonb,
  'distance_m',
  'higher_is_better',
  21,
  '{"time_s": {"type": "number", "label": "Čas (s)", "default": 720, "readonly": true}, "distance_m": {"type": "number", "label": "Uběhnutá vzdálenost (m)", "required": true}, "incline_pct": {"type": "number", "label": "Sklon (%)", "default": 1, "min": 0, "max": 15, "required": true}}'::jsonb,
  '{"avg_hr": {"type": "number", "label": "Prům. TF"}, "max_hr": {"type": "number", "label": "Max TF"}, "vo2max_calculated": {"type": "number", "label": "VO2max (ml/kg/min)"}, "avg_speed_kmh": {"type": "number", "label": "Prům. rychlost (km/h)"}, "max_speed_kmh": {"type": "number", "label": "Max rychlost (km/h)"}, "avg_cadence_spm": {"type": "number", "label": "Prům. kadence (SPM)"}, "calories_kcal": {"type": "number", "label": "Spálené kalorie (kcal)"}}'::jsonb,
  '{"requires_same_incline": true}'::jsonb,
  true
);