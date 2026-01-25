-- Add trainer_rating and client_reply to all nutrition entry tables

-- Food entries
ALTER TABLE nutrition_food_entries ADD COLUMN IF NOT EXISTS trainer_rating SMALLINT;
ALTER TABLE nutrition_food_entries ADD CONSTRAINT nutrition_food_entries_trainer_rating_check 
  CHECK (trainer_rating IS NULL OR (trainer_rating >= 1 AND trainer_rating <= 10));
ALTER TABLE nutrition_food_entries ADD COLUMN IF NOT EXISTS client_reply TEXT;

-- Drink entries
ALTER TABLE nutrition_drink_entries ADD COLUMN IF NOT EXISTS trainer_rating SMALLINT;
ALTER TABLE nutrition_drink_entries ADD CONSTRAINT nutrition_drink_entries_trainer_rating_check 
  CHECK (trainer_rating IS NULL OR (trainer_rating >= 1 AND trainer_rating <= 10));
ALTER TABLE nutrition_drink_entries ADD COLUMN IF NOT EXISTS client_reply TEXT;

-- Coffee entries
ALTER TABLE nutrition_coffee_entries ADD COLUMN IF NOT EXISTS trainer_rating SMALLINT;
ALTER TABLE nutrition_coffee_entries ADD CONSTRAINT nutrition_coffee_entries_trainer_rating_check 
  CHECK (trainer_rating IS NULL OR (trainer_rating >= 1 AND trainer_rating <= 10));
ALTER TABLE nutrition_coffee_entries ADD COLUMN IF NOT EXISTS client_reply TEXT;

-- Add is_checked to day notes
ALTER TABLE nutrition_day_notes ADD COLUMN IF NOT EXISTS is_checked BOOLEAN DEFAULT false;
ALTER TABLE nutrition_day_notes ADD COLUMN IF NOT EXISTS checked_at TIMESTAMPTZ;