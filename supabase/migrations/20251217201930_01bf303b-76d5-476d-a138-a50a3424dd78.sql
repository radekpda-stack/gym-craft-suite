-- =============================================
-- MODULAR DIAGNOSTICS SYSTEM (EAV)
-- =============================================

-- Sekce dotazníku
CREATE TABLE public.diagnostic_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  user_id UUID, -- NULL = systémová sekce
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Otázky v sekci
CREATE TABLE public.diagnostic_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.diagnostic_sections(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_text_en TEXT,
  question_type TEXT NOT NULL, -- number/boolean/scale/text/select/multiselect
  unit TEXT, -- např. "hodin", "kg", atd.
  options JSONB, -- pro select/multiselect
  min_value DECIMAL, -- pro scale
  max_value DECIMAL, -- pro scale
  is_required BOOLEAN DEFAULT false,
  help_text TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Nová hlavička assessmentu (jednodušší)
CREATE TABLE public.diagnostic_assessments_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  diagnostic_id UUID REFERENCES public.diagnostics(id) ON DELETE CASCADE,
  assessment_type TEXT DEFAULT 'entry', -- entry/follow-up/return-to-training
  ai_analysis TEXT,
  ai_risk_factors TEXT[],
  ai_strengths TEXT[],
  ai_priorities TEXT[],
  ai_recommendations TEXT,
  ai_contraindications TEXT[],
  ai_must_do_exercises TEXT[],
  ai_avoid_exercises TEXT[],
  is_draft BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL
);

-- Odpovědi klientů
CREATE TABLE public.diagnostic_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.diagnostic_assessments_v2(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.diagnostic_questions(id),
  value JSONB NOT NULL, -- flexibilní hodnota (číslo, text, pole, atd.)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.diagnostic_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_assessments_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_answers ENABLE ROW LEVEL SECURITY;

-- Diagnostic Sections policies (viewable by all authenticated, editable by owner/system)
CREATE POLICY "Users can view diagnostic_sections" ON public.diagnostic_sections FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can create their own diagnostic_sections" ON public.diagnostic_sections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own diagnostic_sections" ON public.diagnostic_sections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own diagnostic_sections" ON public.diagnostic_sections FOR DELETE USING (auth.uid() = user_id);

-- Diagnostic Questions policies
CREATE POLICY "Users can view diagnostic_questions" ON public.diagnostic_questions FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can create their own diagnostic_questions" ON public.diagnostic_questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own diagnostic_questions" ON public.diagnostic_questions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own diagnostic_questions" ON public.diagnostic_questions FOR DELETE USING (auth.uid() = user_id);

-- Diagnostic Assessments v2 policies
CREATE POLICY "Users can view their own diagnostic_assessments_v2" ON public.diagnostic_assessments_v2 FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own diagnostic_assessments_v2" ON public.diagnostic_assessments_v2 FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own diagnostic_assessments_v2" ON public.diagnostic_assessments_v2 FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own diagnostic_assessments_v2" ON public.diagnostic_assessments_v2 FOR DELETE USING (auth.uid() = user_id);

-- Diagnostic Answers policies
CREATE POLICY "Users can view answers for their assessments" ON public.diagnostic_answers FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.diagnostic_assessments_v2 WHERE id = assessment_id AND user_id = auth.uid()));
CREATE POLICY "Users can create answers for their assessments" ON public.diagnostic_answers FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.diagnostic_assessments_v2 WHERE id = assessment_id AND user_id = auth.uid()));
CREATE POLICY "Users can update answers for their assessments" ON public.diagnostic_answers FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.diagnostic_assessments_v2 WHERE id = assessment_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete answers for their assessments" ON public.diagnostic_answers FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.diagnostic_assessments_v2 WHERE id = assessment_id AND user_id = auth.uid()));

-- =============================================
-- DEFAULT SECTIONS AND QUESTIONS (SEED DATA)
-- =============================================

-- Insert default sections
INSERT INTO public.diagnostic_sections (id, name, name_en, description, sort_order, is_active, user_id) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Osobní údaje', 'Personal Info', 'Základní informace o klientovi', 1, true, NULL),
  ('a1000000-0000-0000-0000-000000000002', 'Životní styl', 'Lifestyle', 'Informace o životním stylu', 2, true, NULL),
  ('a1000000-0000-0000-0000-000000000003', 'Zdravotní stav', 'Health Status', 'Zdravotní historie a omezení', 3, true, NULL),
  ('a1000000-0000-0000-0000-000000000004', 'Cíle', 'Goals', 'Tréninkové cíle klienta', 4, true, NULL),
  ('a1000000-0000-0000-0000-000000000005', 'Mobilita', 'Mobility', 'Hodnocení mobility', 5, true, NULL),
  ('a1000000-0000-0000-0000-000000000006', 'Kvalita pohybu', 'Movement Quality', 'Hodnocení kvality pohybových vzorců', 6, true, NULL),
  ('a1000000-0000-0000-0000-000000000007', 'Screening bolesti', 'Pain Screening', 'Mapování bolestivých oblastí', 7, true, NULL),
  ('a1000000-0000-0000-0000-000000000008', 'Psychika', 'Psychology', 'Psychologický profil', 8, true, NULL),
  ('a1000000-0000-0000-0000-000000000009', 'Strava', 'Nutrition', 'Stravovací návyky', 9, true, NULL),
  ('a1000000-0000-0000-0000-000000000010', 'Poznámky trenéra', 'Trainer Notes', 'Volné poznámky trenéra', 10, true, NULL);

-- Insert default questions for each section
-- Section 1: Osobní údaje
INSERT INTO public.diagnostic_questions (section_id, question_text, question_text_en, question_type, unit, sort_order, is_required, user_id) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Povolání', 'Occupation', 'text', NULL, 1, false, NULL),
  ('a1000000-0000-0000-0000-000000000001', 'Dominantní ruka', 'Handedness', 'select', NULL, 2, false, NULL),
  ('a1000000-0000-0000-0000-000000000001', 'Hodin sezení denně', 'Daily sitting hours', 'number', 'hodin', 3, false, NULL);

-- Section 2: Životní styl
INSERT INTO public.diagnostic_questions (section_id, question_text, question_text_en, question_type, unit, min_value, max_value, sort_order, is_required, user_id) VALUES
  ('a1000000-0000-0000-0000-000000000002', 'Sportovní historie', 'Sports history', 'text', NULL, NULL, NULL, 1, false, NULL),
  ('a1000000-0000-0000-0000-000000000002', 'Současné aktivity', 'Current activities', 'multiselect', NULL, NULL, NULL, 2, false, NULL),
  ('a1000000-0000-0000-0000-000000000002', 'Hodin spánku', 'Sleep hours', 'number', 'hodin', NULL, NULL, 3, false, NULL),
  ('a1000000-0000-0000-0000-000000000002', 'Kvalita spánku', 'Sleep quality', 'scale', NULL, 1, 10, 4, false, NULL),
  ('a1000000-0000-0000-0000-000000000002', 'Úroveň stresu', 'Stress level', 'scale', NULL, 1, 10, 5, false, NULL),
  ('a1000000-0000-0000-0000-000000000002', 'Medituje', 'Meditates', 'boolean', NULL, NULL, NULL, 6, false, NULL);

-- Section 3: Zdravotní stav
INSERT INTO public.diagnostic_questions (section_id, question_text, question_text_en, question_type, sort_order, is_required, user_id) VALUES
  ('a1000000-0000-0000-0000-000000000003', 'Onemocnění', 'Diseases', 'multiselect', 1, false, NULL),
  ('a1000000-0000-0000-0000-000000000003', 'Operace', 'Surgeries', 'multiselect', 2, false, NULL),
  ('a1000000-0000-0000-0000-000000000003', 'Zranění', 'Injuries', 'multiselect', 3, false, NULL),
  ('a1000000-0000-0000-0000-000000000003', 'Alergie', 'Allergies', 'multiselect', 4, false, NULL),
  ('a1000000-0000-0000-0000-000000000003', 'Rodinná zdravotní historie', 'Family health history', 'text', 5, false, NULL);

-- Section 4: Cíle
INSERT INTO public.diagnostic_questions (section_id, question_text, question_text_en, question_type, sort_order, is_required, user_id) VALUES
  ('a1000000-0000-0000-0000-000000000004', 'Krátkodobé cíle', 'Short-term goals', 'text', 1, false, NULL),
  ('a1000000-0000-0000-0000-000000000004', 'Dlouhodobé cíle', 'Long-term goals', 'text', 2, false, NULL),
  ('a1000000-0000-0000-0000-000000000004', 'Tréninkové priority', 'Training priorities', 'multiselect', 3, false, NULL);

-- Section 5: Mobilita
INSERT INTO public.diagnostic_questions (section_id, question_text, question_text_en, question_type, options, sort_order, is_required, user_id) VALUES
  ('a1000000-0000-0000-0000-000000000005', 'Mobilita kotníků', 'Ankle mobility', 'select', '["OK", "Omezená", "Bolestivá"]', 1, false, NULL),
  ('a1000000-0000-0000-0000-000000000005', 'Mobilita kyčlí', 'Hip mobility', 'select', '["OK", "Omezená", "Bolestivá"]', 2, false, NULL),
  ('a1000000-0000-0000-0000-000000000005', 'Mobilita hrudní páteře', 'Thoracic mobility', 'select', '["OK", "Omezená", "Bolestivá"]', 3, false, NULL),
  ('a1000000-0000-0000-0000-000000000005', 'Mobilita ramen', 'Shoulder mobility', 'select', '["OK", "Omezená", "Bolestivá"]', 4, false, NULL);

-- Section 6: Kvalita pohybu
INSERT INTO public.diagnostic_questions (section_id, question_text, question_text_en, question_type, min_value, max_value, sort_order, is_required, user_id) VALUES
  ('a1000000-0000-0000-0000-000000000006', 'Dřep', 'Squat', 'scale', 1, 5, 1, false, NULL),
  ('a1000000-0000-0000-0000-000000000006', 'Výpad', 'Lunge', 'scale', 1, 5, 2, false, NULL),
  ('a1000000-0000-0000-0000-000000000006', 'Tlak', 'Push', 'scale', 1, 5, 3, false, NULL),
  ('a1000000-0000-0000-0000-000000000006', 'Tah', 'Pull', 'scale', 1, 5, 4, false, NULL),
  ('a1000000-0000-0000-0000-000000000006', 'Hip Hinge', 'Hip Hinge', 'scale', 1, 5, 5, false, NULL),
  ('a1000000-0000-0000-0000-000000000006', 'Core stabilita', 'Core stability', 'scale', 1, 5, 6, false, NULL);

-- Section 7: Screening bolesti
INSERT INTO public.diagnostic_questions (section_id, question_text, question_text_en, question_type, options, sort_order, is_required, user_id) VALUES
  ('a1000000-0000-0000-0000-000000000007', 'Bolest krku', 'Neck pain', 'select', '["Žádná", "Mírná", "Výrazná"]', 1, false, NULL),
  ('a1000000-0000-0000-0000-000000000007', 'Bolest ramene', 'Shoulder pain', 'select', '["Žádná", "Mírná", "Výrazná"]', 2, false, NULL),
  ('a1000000-0000-0000-0000-000000000007', 'Bolest hrudní páteře', 'Thoracic pain', 'select', '["Žádná", "Mírná", "Výrazná"]', 3, false, NULL),
  ('a1000000-0000-0000-0000-000000000007', 'Bolest bederní páteře', 'Lumbar pain', 'select', '["Žádná", "Mírná", "Výrazná"]', 4, false, NULL),
  ('a1000000-0000-0000-0000-000000000007', 'Bolest SI kloubu', 'SI joint pain', 'select', '["Žádná", "Mírná", "Výrazná"]', 5, false, NULL),
  ('a1000000-0000-0000-0000-000000000007', 'Bolest kyčle', 'Hip pain', 'select', '["Žádná", "Mírná", "Výrazná"]', 6, false, NULL),
  ('a1000000-0000-0000-0000-000000000007', 'Bolest kolene', 'Knee pain', 'select', '["Žádná", "Mírná", "Výrazná"]', 7, false, NULL),
  ('a1000000-0000-0000-0000-000000000007', 'Bolest kotníku', 'Ankle pain', 'select', '["Žádná", "Mírná", "Výrazná"]', 8, false, NULL);

-- Section 8: Psychika
INSERT INTO public.diagnostic_questions (section_id, question_text, question_text_en, question_type, min_value, max_value, sort_order, is_required, user_id) VALUES
  ('a1000000-0000-0000-0000-000000000008', 'Úroveň motivace', 'Motivation level', 'scale', 1, 10, 1, false, NULL),
  ('a1000000-0000-0000-0000-000000000008', 'Úroveň disciplíny', 'Discipline level', 'scale', 1, 10, 2, false, NULL),
  ('a1000000-0000-0000-0000-000000000008', 'Zvládání stresu', 'Stress management', 'text', NULL, NULL, 3, false, NULL),
  ('a1000000-0000-0000-0000-000000000008', 'Preferovaný styl tréninku', 'Preferred training style', 'select', NULL, NULL, 4, false, NULL);

-- Section 9: Strava
INSERT INTO public.diagnostic_questions (section_id, question_text, question_text_en, question_type, sort_order, is_required, user_id) VALUES
  ('a1000000-0000-0000-0000-000000000009', 'Pravidelnost stravování', 'Eating regularity', 'select', 1, false, NULL),
  ('a1000000-0000-0000-0000-000000000009', 'Potravinové alergie', 'Food allergies', 'multiselect', 2, false, NULL),
  ('a1000000-0000-0000-0000-000000000009', 'Doplňky stravy', 'Supplements', 'multiselect', 3, false, NULL),
  ('a1000000-0000-0000-0000-000000000009', 'Dietní omezení', 'Dietary restrictions', 'multiselect', 4, false, NULL);

-- Section 10: Poznámky trenéra
INSERT INTO public.diagnostic_questions (section_id, question_text, question_text_en, question_type, sort_order, is_required, user_id) VALUES
  ('a1000000-0000-0000-0000-000000000010', 'Poznámky', 'Notes', 'text', 1, false, NULL);

-- Trigger for updated_at on assessments v2
CREATE TRIGGER update_diagnostic_assessments_v2_updated_at
  BEFORE UPDATE ON public.diagnostic_assessments_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();