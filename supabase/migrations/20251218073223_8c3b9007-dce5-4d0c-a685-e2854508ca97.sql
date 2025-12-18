-- Add calorie estimate columns to nutrition_food_entries
ALTER TABLE nutrition_food_entries 
ADD COLUMN IF NOT EXISTS calorie_estimate_low integer,
ADD COLUMN IF NOT EXISTS calorie_estimate_high integer;