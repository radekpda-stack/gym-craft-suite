-- Add trainer_comment column to nutrition entry tables
ALTER TABLE public.nutrition_food_entries 
ADD COLUMN IF NOT EXISTS trainer_comment TEXT;

ALTER TABLE public.nutrition_drink_entries 
ADD COLUMN IF NOT EXISTS trainer_comment TEXT;

ALTER TABLE public.nutrition_coffee_entries 
ADD COLUMN IF NOT EXISTS trainer_comment TEXT;