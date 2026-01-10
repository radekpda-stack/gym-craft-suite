-- Add side column to exercise_entries for unilateral exercises
ALTER TABLE exercise_entries 
ADD COLUMN side text CHECK (side IN ('left', 'right', 'both', 'none'));

-- Set default value for existing unilateral exercise entries
UPDATE exercise_entries SET side = 'both' 
WHERE exercise_id IN (SELECT id FROM exercises WHERE is_unilateral = true);

-- Set 'none' for non-unilateral exercises
UPDATE exercise_entries SET side = 'none'
WHERE side IS NULL;

-- Update is_unilateral for single-leg plyometric exercises
UPDATE exercises SET is_unilateral = true 
WHERE name_cs LIKE '%jedné nohy%' 
   OR name_cs LIKE '%jednonož%'
   OR name_cs LIKE '%Jednoskok%'
   OR name LIKE '%Single Leg%'
   OR name LIKE '%Single-leg%'
   OR name LIKE '%Unilateral%';