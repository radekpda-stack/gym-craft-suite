-- =====================================================
-- Fáze 1: Rozšíření training_sessions o client_rpe a training_load
-- =====================================================

-- Přidat sloupce pro denormalizované RPE a training load
ALTER TABLE training_sessions 
  ADD COLUMN IF NOT EXISTS client_rpe INTEGER CHECK (client_rpe >= 1 AND client_rpe <= 10),
  ADD COLUMN IF NOT EXISTS training_load INTEGER;

-- Komentáře pro dokumentaci
COMMENT ON COLUMN training_sessions.rpe IS 'Coach RPE (1-10) - hodnocení náročnosti trenérem';
COMMENT ON COLUMN training_sessions.client_rpe IS 'Client RPE (1-10) - denormalizovaná hodnota z training_feedback.difficulty';
COMMENT ON COLUMN training_sessions.training_load IS 'Training Load = duration * COALESCE(client_rpe, rpe)';

-- =====================================================
-- Fáze 2: Trigger pro automatický přepočet training_load
-- =====================================================

CREATE OR REPLACE FUNCTION public.calculate_training_load()
RETURNS TRIGGER AS $$
BEGIN
  -- Pokud existuje duration a alespoň jedno RPE, vypočítej load
  IF NEW.duration IS NOT NULL AND (NEW.client_rpe IS NOT NULL OR NEW.rpe IS NOT NULL) THEN
    NEW.training_load := NEW.duration * COALESCE(NEW.client_rpe, NEW.rpe);
  ELSE
    NEW.training_load := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_calculate_training_load ON training_sessions;

-- Create trigger
CREATE TRIGGER trg_calculate_training_load
  BEFORE INSERT OR UPDATE OF duration, rpe, client_rpe ON training_sessions
  FOR EACH ROW EXECUTE FUNCTION public.calculate_training_load();

-- =====================================================
-- Fáze 3: Trigger pro synchronizaci client_rpe z feedbacku
-- =====================================================

CREATE OR REPLACE FUNCTION public.sync_client_rpe_from_feedback()
RETURNS TRIGGER AS $$
BEGIN
  -- Při vložení nebo update feedbacku synchronizuj client_rpe do training_sessions
  IF NEW.training_session_id IS NOT NULL AND NEW.difficulty IS NOT NULL THEN
    UPDATE training_sessions 
    SET client_rpe = NEW.difficulty
    WHERE id = NEW.training_session_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_sync_client_rpe ON training_feedback;

-- Create trigger
CREATE TRIGGER trg_sync_client_rpe
  AFTER INSERT OR UPDATE OF difficulty ON training_feedback
  FOR EACH ROW EXECUTE FUNCTION public.sync_client_rpe_from_feedback();

-- =====================================================
-- Fáze 4: Tabulka pro rychlé sady (Training Presets)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.training_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT, -- lucide icon name
  color TEXT,
  training_type TEXT,
  focus_tag_ids UUID[] DEFAULT '{}',
  intensity_tag_id UUID,
  body_part_tag_ids UUID[] DEFAULT '{}',
  default_rpe INTEGER CHECK (default_rpe >= 1 AND default_rpe <= 10),
  sort_order INTEGER DEFAULT 0,
  is_global BOOLEAN DEFAULT true, -- pro všechny klienty trenéra
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE, -- nebo specifický pro klienta
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE training_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own presets"
  ON training_presets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own presets"
  ON training_presets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presets"
  ON training_presets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presets"
  ON training_presets FOR DELETE
  USING (auth.uid() = user_id);

-- Index pro rychlé vyhledávání
CREATE INDEX IF NOT EXISTS idx_training_presets_user_id ON training_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_training_presets_client_id ON training_presets(client_id);

-- =====================================================
-- Fáze 5: Migrace existujících dat - denormalizace client_rpe
-- =====================================================

-- Denormalizovat client_rpe z existujících feedbacků
UPDATE training_sessions ts
SET client_rpe = (
  SELECT tf.difficulty 
  FROM training_feedback tf 
  WHERE tf.training_session_id = ts.id
    AND tf.difficulty IS NOT NULL
  ORDER BY tf.created_at DESC
  LIMIT 1
)
WHERE ts.client_rpe IS NULL 
  AND EXISTS (
    SELECT 1 FROM training_feedback tf 
    WHERE tf.training_session_id = ts.id AND tf.difficulty IS NOT NULL
  );

-- Přepočítat training_load pro existující záznamy
UPDATE training_sessions
SET training_load = duration * COALESCE(client_rpe, rpe)
WHERE training_load IS NULL 
  AND duration IS NOT NULL
  AND (client_rpe IS NOT NULL OR rpe IS NOT NULL);