-- =====================================================
-- FÁZE 1: Deník Návyků - Databázové změny (opravená verze)
-- =====================================================

-- A) Nová tabulka: client_habit_settings
CREATE TABLE IF NOT EXISTS public.client_habit_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  water_goal_ml INT NOT NULL DEFAULT 2000,
  sleep_time TIME NULL,
  wake_time TIME NULL,
  caffeine_cutoff_minutes INT NOT NULL DEFAULT 480,
  sleep_time_last_set_by TEXT NOT NULL DEFAULT 'system'
    CHECK (sleep_time_last_set_by IN ('client', 'trainer', 'system')),
  sleep_time_last_set_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

-- B) Nová tabulka: nutrition_day_notes
CREATE TABLE IF NOT EXISTS public.nutrition_day_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  client_note TEXT NULL,
  trainer_note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, date)
);

-- C) Úprava nutrition_coffee_entries - přidat is_caffeinated a coffee_amount_ml
ALTER TABLE public.nutrition_coffee_entries 
ADD COLUMN IF NOT EXISTS is_caffeinated BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.nutrition_coffee_entries 
ADD COLUMN IF NOT EXISTS coffee_amount_ml INT NULL;

-- D) Přidat occurred_at, trainer_comment, trainer_edited, trainer_edited_at, created_from do všech entry tabulek

-- nutrition_food_entries
ALTER TABLE public.nutrition_food_entries 
ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ NULL;

ALTER TABLE public.nutrition_food_entries 
ADD COLUMN IF NOT EXISTS trainer_comment TEXT NULL;

ALTER TABLE public.nutrition_food_entries 
ADD COLUMN IF NOT EXISTS trainer_edited BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.nutrition_food_entries 
ADD COLUMN IF NOT EXISTS trainer_edited_at TIMESTAMPTZ NULL;

ALTER TABLE public.nutrition_food_entries 
ADD COLUMN IF NOT EXISTS created_from TEXT NULL DEFAULT 'web';

-- nutrition_drink_entries
ALTER TABLE public.nutrition_drink_entries 
ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ NULL;

ALTER TABLE public.nutrition_drink_entries 
ADD COLUMN IF NOT EXISTS trainer_comment TEXT NULL;

ALTER TABLE public.nutrition_drink_entries 
ADD COLUMN IF NOT EXISTS trainer_edited BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.nutrition_drink_entries 
ADD COLUMN IF NOT EXISTS trainer_edited_at TIMESTAMPTZ NULL;

ALTER TABLE public.nutrition_drink_entries 
ADD COLUMN IF NOT EXISTS created_from TEXT NULL DEFAULT 'web';

-- nutrition_coffee_entries
ALTER TABLE public.nutrition_coffee_entries 
ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ NULL;

ALTER TABLE public.nutrition_coffee_entries 
ADD COLUMN IF NOT EXISTS trainer_comment TEXT NULL;

ALTER TABLE public.nutrition_coffee_entries 
ADD COLUMN IF NOT EXISTS trainer_edited BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.nutrition_coffee_entries 
ADD COLUMN IF NOT EXISTS trainer_edited_at TIMESTAMPTZ NULL;

ALTER TABLE public.nutrition_coffee_entries 
ADD COLUMN IF NOT EXISTS created_from TEXT NULL DEFAULT 'web';

-- E) Migrace existujících dat - nastavit occurred_at z entry_date + entry_time
-- Opravený formát: použít make_timestamptz nebo správnou konkatenaci

-- Pro food entries - entry_time je ve formátu HH:MM, nepřidávat další :00
UPDATE public.nutrition_food_entries 
SET occurred_at = (entry_date + COALESCE(entry_time::time, '12:00:00'::time))
WHERE occurred_at IS NULL AND entry_date IS NOT NULL;

-- Pro drink entries
UPDATE public.nutrition_drink_entries 
SET occurred_at = (entry_date + COALESCE(entry_time::time, '12:00:00'::time))
WHERE occurred_at IS NULL AND entry_date IS NOT NULL;

-- Pro coffee entries
UPDATE public.nutrition_coffee_entries 
SET occurred_at = (entry_date + COALESCE(entry_time::time, '12:00:00'::time))
WHERE occurred_at IS NULL AND entry_date IS NOT NULL;

-- F) Enable RLS
ALTER TABLE public.client_habit_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_day_notes ENABLE ROW LEVEL SECURITY;

-- G) RLS Politiky pro client_habit_settings

-- Trenér může vše pro své klienty
CREATE POLICY "Trainer can manage habit settings for their clients"
ON public.client_habit_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_habit_settings.client_id
    AND c.user_id = auth.uid()
  )
);

-- Klient může číst a upravovat své nastavení
CREATE POLICY "Client can manage own habit settings"
ON public.client_habit_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.client_accounts ca
    WHERE ca.client_id = client_habit_settings.client_id
    AND ca.auth_user_id = auth.uid()
  )
);

-- H) RLS Politiky pro nutrition_day_notes

-- Trenér může vše pro své klienty
CREATE POLICY "Trainer can manage day notes for their clients"
ON public.nutrition_day_notes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = nutrition_day_notes.client_id
    AND c.user_id = auth.uid()
  )
);

-- Klient může číst a upravovat své poznámky
CREATE POLICY "Client can manage own day notes"
ON public.nutrition_day_notes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.client_accounts ca
    WHERE ca.client_id = nutrition_day_notes.client_id
    AND ca.auth_user_id = auth.uid()
  )
);

-- I) Trigger pro updated_at na nových tabulkách
CREATE TRIGGER update_client_habit_settings_updated_at
BEFORE UPDATE ON public.client_habit_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_nutrition_day_notes_updated_at
BEFORE UPDATE ON public.nutrition_day_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();