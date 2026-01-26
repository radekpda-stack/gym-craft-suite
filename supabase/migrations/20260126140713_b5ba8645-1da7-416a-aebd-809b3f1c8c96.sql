-- Add side column to client_workout_exercises for tracking left/right side
ALTER TABLE client_workout_exercises
ADD COLUMN IF NOT EXISTS side TEXT DEFAULT 'none';

-- Add check constraint for valid side values
ALTER TABLE client_workout_exercises
ADD CONSTRAINT client_workout_exercises_side_check 
CHECK (side IN ('left', 'right', 'both', 'none'));

-- Create index for efficient queries on side
CREATE INDEX IF NOT EXISTS idx_client_workout_exercises_side ON client_workout_exercises(side);