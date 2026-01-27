-- Add next_measurement_date column to measurements table
ALTER TABLE measurements 
ADD COLUMN IF NOT EXISTS next_measurement_date DATE;