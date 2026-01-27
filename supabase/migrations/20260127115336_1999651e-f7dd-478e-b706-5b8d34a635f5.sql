-- Add remind_after_date and measurement_id columns to training_followups
ALTER TABLE training_followups 
ADD COLUMN IF NOT EXISTS remind_after_date DATE,
ADD COLUMN IF NOT EXISTS measurement_id UUID REFERENCES measurements(id) ON DELETE CASCADE;