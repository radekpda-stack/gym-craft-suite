-- Add column for storing pain area intensities as JSONB
ALTER TABLE public.training_feedback 
ADD COLUMN IF NOT EXISTS pain_area_intensities jsonb DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.training_feedback.pain_area_intensities IS 'Stores pain intensity (1-10) per body area as JSON object, e.g. {"knee_left": 7, "lower_back": 5}';