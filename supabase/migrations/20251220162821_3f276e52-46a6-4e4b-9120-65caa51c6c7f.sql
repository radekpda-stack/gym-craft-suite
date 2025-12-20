-- Master Prompt Implementation: Phase 2 & 4 database changes

-- Phase 2: Add is_high_intensity_test flag to training_sessions for red flag brake
ALTER TABLE public.training_sessions
ADD COLUMN IF NOT EXISTS is_high_intensity_test BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.training_sessions.is_high_intensity_test IS 'When true, feedback red flags will be suppressed for this training (e.g., intentional high intensity or test session)';

-- Phase 4: Add after_16 flag to nutrition_coffee_entries for time context
ALTER TABLE public.nutrition_coffee_entries
ADD COLUMN IF NOT EXISTS after_16 BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.nutrition_coffee_entries.after_16 IS 'Indicates if coffee was consumed after 16:00';