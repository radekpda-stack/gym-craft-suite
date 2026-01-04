-- Add circuit training columns to training_templates
ALTER TABLE training_templates 
ADD COLUMN IF NOT EXISTS workout_format TEXT DEFAULT 'standard';

ALTER TABLE training_templates 
ADD COLUMN IF NOT EXISTS time_cap_seconds INTEGER;

ALTER TABLE training_templates 
ADD COLUMN IF NOT EXISTS rounds INTEGER;

ALTER TABLE training_templates 
ADD COLUMN IF NOT EXISTS work_interval_seconds INTEGER;

ALTER TABLE training_templates 
ADD COLUMN IF NOT EXISTS rest_interval_seconds INTEGER;

-- Add comment for workout_format values
COMMENT ON COLUMN training_templates.workout_format IS 'standard, amrap, emom, for_time, tabata, circuit';