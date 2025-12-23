-- ============================================
-- COMPLETE MIGRATION: All tables and data
-- ============================================

-- 1. MUSCLE GROUPS TABLE
CREATE TABLE public.muscle_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  name_cz TEXT NOT NULL,
  name_en TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('dolni_koncetiny', 'horni_koncetiny', 'trup')),
  side_relevant BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.muscle_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Muscle groups are viewable by everyone" ON public.muscle_groups FOR SELECT USING (true);

INSERT INTO public.muscle_groups (name, name_cz, name_en, region, side_relevant, display_order) VALUES
('quadriceps', 'Quadriceps', 'Quadriceps', 'dolni_koncetiny', true, 1),
('hamstrings', 'Hamstringy', 'Hamstrings', 'dolni_koncetiny', true, 2),
('gluteus_maximus', 'Gluteus maximus', 'Gluteus Maximus', 'dolni_koncetiny', false, 3),
('gluteus_medius', 'Gluteus medius', 'Gluteus Medius', 'dolni_koncetiny', true, 4),
('calves', 'Lýtka', 'Calves', 'dolni_koncetiny', true, 5),
('adductors', 'Adduktory', 'Adductors', 'dolni_koncetiny', true, 6),
('abductors', 'Abduktory', 'Abductors', 'dolni_koncetiny', true, 7),
('core_anti_extension', 'Core – anti-extension', 'Core – Anti-Extension', 'trup', false, 8),
('core_anti_rotation', 'Core – anti-rotace', 'Core – Anti-Rotation', 'trup', false, 9),
('core_rotation', 'Core – rotace', 'Core – Rotation', 'trup', false, 10),
('core_lateral', 'Core – laterální stabilita', 'Core – Lateral Stability', 'trup', true, 11),
('back_vertical_pull', 'Záda – vertikální tah', 'Back – Vertical Pull', 'horni_koncetiny', false, 12),
('back_horizontal_pull', 'Záda – horizontální tah', 'Back – Horizontal Pull', 'horni_koncetiny', false, 13),
('shoulders_front', 'Ramena – přední', 'Shoulders – Front', 'horni_koncetiny', true, 14),
('shoulders_middle', 'Ramena – střední', 'Shoulders – Middle', 'horni_koncetiny', true, 15),
('shoulders_rear', 'Ramena – zadní', 'Shoulders – Rear', 'horni_koncetiny', true, 16),
('triceps', 'Triceps', 'Triceps', 'horni_koncetiny', true, 17),
('biceps', 'Biceps', 'Biceps', 'horni_koncetiny', true, 18),
('serratus_anterior', 'Serratus anterior', 'Serratus Anterior', 'horni_koncetiny', true, 19),
('erector_spinae', 'Erector spinae', 'Erector Spinae', 'trup', true, 20);

-- 2. EQUIPMENT TABLE
CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  name_cz TEXT NOT NULL,
  category TEXT CHECK (category IN ('free_weights', 'machines', 'bodyweight', 'cardio', 'accessories')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipment is viewable by everyone" ON public.equipment FOR SELECT USING (true);

INSERT INTO public.equipment (name, name_cz, category) VALUES
('dumbbells', 'Jednoručky (1–22 kg)', 'free_weights'),
('kettlebell', 'Kettlebell (4–20 kg)', 'free_weights'),
('barbell_olympic_20', 'Olympijská osa 20 kg', 'free_weights'),
('barbell_olympic_12', 'Olympijská osa 12,5 kg', 'free_weights'),
('landmine', 'Landmine kloub', 'accessories'),
('trx', 'TRX', 'accessories'),
('trx_rip_trainer', 'TRX Rip Trainer', 'accessories'),
('bands', 'Gumy (odporové)', 'accessories'),
('wallball', 'Wallball (2–4 kg)', 'free_weights'),
('rings', 'Gymnastické kruhy', 'bodyweight'),
('power_rack', 'Silová klec', 'bodyweight'),
('box', 'Bedna', 'accessories'),
('treadmill', 'Běžecký pás', 'cardio'),
('rower', 'Veslo (trenažér)', 'cardio'),
('ski_erg', 'SkiErg', 'cardio'),
('flowin', 'Flowin', 'accessories'),
('bodyweight', 'Vlastní váha', 'bodyweight'),
('barbell', 'Velká osa', 'free_weights'),
('cable', 'Kladka', 'machines'),
('bench', 'Lavice', 'accessories'),
('pull_up_bar', 'Hrazda', 'bodyweight'),
('mat', 'Podložka', 'accessories'),
('foam_roller', 'Pěnový válec', 'accessories'),
('step', 'Stupínek', 'accessories'),
('medicine_ball', 'Medicinbal', 'free_weights');

-- 3. MUSCLE GROUP ALIASES
CREATE TABLE public.muscle_group_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias TEXT NOT NULL UNIQUE,
  muscle_group_id UUID REFERENCES public.muscle_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.muscle_group_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Muscle group aliases are viewable by everyone" ON public.muscle_group_aliases FOR SELECT USING (true);

INSERT INTO public.muscle_group_aliases (alias, muscle_group_id)
SELECT alias, mg.id FROM (VALUES
  ('back', 'back_horizontal_pull'),
  ('lats', 'back_vertical_pull'),
  ('core', 'core_anti_extension'),
  ('abs', 'core_anti_extension'),
  ('glutes', 'gluteus_maximus'),
  ('quads', 'quadriceps'),
  ('shoulders', 'shoulders_middle'),
  ('obliques', 'core_rotation'),
  ('rear delts', 'shoulders_rear')
) AS t(alias, muscle_name)
JOIN public.muscle_groups mg ON mg.name = t.muscle_name;

-- 4. EXTEND EXERCISES TABLE
ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS rehab_safe BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS performance_load TEXT CHECK (performance_load IN ('low', 'medium', 'high'));

ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_movement_pattern_check;
ALTER TABLE public.exercises ADD CONSTRAINT exercises_movement_pattern_check 
CHECK ((movement_pattern IS NULL) OR (movement_pattern = ANY (ARRAY[
  'squat', 'hinge', 'lunge', 
  'push_horizontal', 'push_vertical', 'diagonal_press',
  'pull_horizontal', 'pull_vertical', 
  'carry', 'rotation',
  'core_anti_extension', 'core_anti_rotation', 'core_anti_lateral_flexion',
  'locomotion', 'conditioning', 'mobility', 'other'
])));

-- 5. EXERCISE MUSCLE GROUPS MAPPING
CREATE TABLE public.exercise_muscle_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  muscle_group_id UUID NOT NULL REFERENCES public.muscle_groups(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('primary', 'secondary')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(exercise_id, muscle_group_id)
);

ALTER TABLE public.exercise_muscle_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Exercise muscle groups viewable by everyone" ON public.exercise_muscle_groups FOR SELECT USING (true);
CREATE POLICY "Users can manage exercise muscle groups" ON public.exercise_muscle_groups FOR ALL 
USING (EXISTS (SELECT 1 FROM public.exercises e WHERE e.id = exercise_id AND (e.user_id = auth.uid() OR e.source = 'system')));

-- 6. EXERCISE EQUIPMENT MAPPING
CREATE TABLE public.exercise_equipment_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(exercise_id, equipment_id)
);

ALTER TABLE public.exercise_equipment_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Exercise equipment map viewable by everyone" ON public.exercise_equipment_map FOR SELECT USING (true);
CREATE POLICY "Users can manage exercise equipment map" ON public.exercise_equipment_map FOR ALL 
USING (EXISTS (SELECT 1 FROM public.exercises e WHERE e.id = exercise_id AND (e.user_id = auth.uid() OR e.source = 'system')));

-- 7. EXERCISE TAG MAPPING
CREATE TABLE public.exercise_tag_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(exercise_id, tag_id)
);

ALTER TABLE public.exercise_tag_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Exercise tag map viewable by everyone" ON public.exercise_tag_map FOR SELECT USING (true);
CREATE POLICY "Users can manage exercise tag map" ON public.exercise_tag_map FOR ALL 
USING (EXISTS (SELECT 1 FROM public.exercises e WHERE e.id = exercise_id AND (e.user_id = auth.uid() OR e.source = 'system')));

-- 8. ADD EXERCISE TAGS
INSERT INTO public.tags (name, tag_type, color, is_system) 
SELECT name, tag_type, '#6366f1', true FROM (VALUES
  ('dolni_koncetiny', 'exercise_body_part'),
  ('horni_telo', 'exercise_body_part'),
  ('ex_core', 'exercise_body_part'),
  ('drep', 'exercise_pattern'),
  ('hinge', 'exercise_pattern'),
  ('tlak', 'exercise_pattern'),
  ('tah', 'exercise_pattern'),
  ('rotace', 'exercise_pattern'),
  ('anti_rotace', 'exercise_pattern'),
  ('carry', 'exercise_pattern'),
  ('unilateral', 'exercise_character'),
  ('bilateral', 'exercise_character'),
  ('explozivni', 'exercise_character'),
  ('rehab', 'exercise_health'),
  ('koleno_friendly', 'exercise_health'),
  ('rameno_friendly', 'exercise_health'),
  ('zada_friendly', 'exercise_health'),
  ('vykon', 'exercise_performance'),
  ('power', 'exercise_performance'),
  ('kondice', 'exercise_performance'),
  ('eq_landmine', 'exercise_equipment'),
  ('eq_jednorucky', 'exercise_equipment'),
  ('eq_kettlebell', 'exercise_equipment'),
  ('eq_osa', 'exercise_equipment'),
  ('eq_trx', 'exercise_equipment'),
  ('eq_kruhy', 'exercise_equipment'),
  ('eq_gumy', 'exercise_equipment')
) AS t(name, tag_type)
WHERE NOT EXISTS (SELECT 1 FROM public.tags WHERE tags.name = t.name);

-- 9. ADD LANDMINE EXERCISES
INSERT INTO public.exercises (
  name, name_cs, name_en, category, subcategory, 
  movement_pattern, difficulty, source, default_unit,
  is_unilateral, rehab_safe, performance_load,
  description_cs, description_en
) VALUES
('Landmine Press', 'Landmine Press', 'Landmine Press', 'Síla', 'Tlak', 'diagonal_press', 'intermediate', 'system', 'reps', true, false, 'medium', 'Diagonální tlak s osou v landmine držáku.', 'Diagonal press with barbell in landmine pivot.'),
('Half-Kneeling Landmine Press', 'Half-Kneeling Landmine Press', 'Half-Kneeling Landmine Press', 'Síla', 'Tlak', 'diagonal_press', 'beginner', 'system', 'reps', true, true, 'low', 'Landmine press v půlkleku.', 'Landmine press in half-kneeling position.'),
('Landmine Row', 'Landmine Row', 'Landmine Row', 'Síla', 'Tah', 'pull_horizontal', 'intermediate', 'system', 'reps', true, false, 'medium', 'Přítah s osou v landmine držáku.', 'Row with barbell in landmine pivot.'),
('Landmine Squat', 'Landmine Squat', 'Landmine Squat', 'Síla', 'Dolní tělo', 'squat', 'beginner', 'system', 'reps', false, true, 'low', 'Dřep s osou v landmine držáku.', 'Squat with barbell in landmine pivot.'),
('Landmine Rotation', 'Landmine Rotation', 'Landmine Rotation', 'Síla', 'Core', 'rotation', 'intermediate', 'system', 'reps', false, false, 'medium', 'Rotace trupu s osou v landmine.', 'Trunk rotation with barbell in landmine pivot.'),
('Landmine Deadlift', 'Landmine Deadlift', 'Landmine Deadlift', 'Síla', 'Dolní tělo', 'hinge', 'intermediate', 'system', 'reps', false, true, 'medium', 'Mrtvý tah s osou v landmine.', 'Deadlift with barbell in landmine pivot.');