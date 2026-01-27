-- Add CAP and PR tracking columns to rx_workout_results
ALTER TABLE rx_workout_results
ADD COLUMN IF NOT EXISTS is_capped BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS capped_rounds INTEGER,
ADD COLUMN IF NOT EXISTS capped_reps INTEGER,
ADD COLUMN IF NOT EXISTS is_personal_record BOOLEAN DEFAULT FALSE;

-- Create index for PR lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_rx_results_client_pr ON rx_workout_results(client_id, is_personal_record) WHERE is_personal_record = TRUE;