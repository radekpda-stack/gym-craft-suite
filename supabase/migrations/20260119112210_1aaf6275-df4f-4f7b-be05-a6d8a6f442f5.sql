-- Add missing body composition fields to measurements table
ALTER TABLE public.measurements 
ADD COLUMN IF NOT EXISTS bmi numeric,
ADD COLUMN IF NOT EXISTS water_percent numeric;

-- Add comments for documentation
COMMENT ON COLUMN public.measurements.bmi IS 'Body Mass Index calculated from weight and height';
COMMENT ON COLUMN public.measurements.water_percent IS 'Total body water percentage from segmental scale';