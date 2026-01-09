-- Add assistance_bands column to workout_entries table
-- This allows storing resistance band selections at the SET level
ALTER TABLE workout_entries 
ADD COLUMN assistance_bands text[] DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN workout_entries.assistance_bands IS 'Array of resistance band types used for this set: lightest, light, medium, strong';