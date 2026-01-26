-- Add RX workout columns to training_templates
ALTER TABLE training_templates 
ADD COLUMN IF NOT EXISTS is_rx_workout BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS scoring_mode TEXT DEFAULT 'standard';

-- Add RX-specific columns to training_template_exercises
ALTER TABLE training_template_exercises
ADD COLUMN IF NOT EXISTS rx_weight_kg NUMERIC,
ADD COLUMN IF NOT EXISTS rx_distance_m NUMERIC,
ADD COLUMN IF NOT EXISTS unit_label TEXT;

-- Add max_load to workout_format enum if not exists (handled via check constraint relaxation)
-- Note: workout_format is stored as TEXT, so we just ensure it accepts max_load

-- Create index for RX workouts filtering
CREATE INDEX IF NOT EXISTS idx_training_templates_is_rx_workout 
ON training_templates(is_rx_workout) WHERE is_rx_workout = true;