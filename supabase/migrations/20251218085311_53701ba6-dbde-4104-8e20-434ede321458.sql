-- Add new columns for enhanced training module
ALTER TABLE public.training_sessions
ADD COLUMN IF NOT EXISTS training_type text DEFAULT 'strength' CHECK (training_type IN ('strength', 'conditioning', 'running', 'regeneration', 'other')),
ADD COLUMN IF NOT EXISTS training_goal text,
ADD COLUMN IF NOT EXISTS rpe integer CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10)),
ADD COLUMN IF NOT EXISTS rir integer CHECK (rir IS NULL OR (rir >= 0 AND rir <= 10)),
ADD COLUMN IF NOT EXISTS total_volume integer,
ADD COLUMN IF NOT EXISTS intensity_notes text,
ADD COLUMN IF NOT EXISTS subjective_difficulty integer CHECK (subjective_difficulty IS NULL OR (subjective_difficulty >= 1 AND subjective_difficulty <= 10)),
ADD COLUMN IF NOT EXISTS trainer_went_well text,
ADD COLUMN IF NOT EXISTS trainer_problems text,
ADD COLUMN IF NOT EXISTS trainer_recommendations text;

-- Add index for training_type filtering
CREATE INDEX IF NOT EXISTS idx_training_sessions_training_type ON public.training_sessions(training_type);
CREATE INDEX IF NOT EXISTS idx_training_sessions_date_client ON public.training_sessions(client_id, date DESC);