-- Add client_request_id for idempotency to all nutrition entry tables
ALTER TABLE nutrition_food_entries 
  ADD COLUMN IF NOT EXISTS client_request_id uuid;

ALTER TABLE nutrition_drink_entries 
  ADD COLUMN IF NOT EXISTS client_request_id uuid;

ALTER TABLE nutrition_coffee_entries 
  ADD COLUMN IF NOT EXISTS client_request_id uuid;

-- Create unique constraints for idempotency (session_id + client_request_id)
-- Use partial index to allow NULL values
CREATE UNIQUE INDEX IF NOT EXISTS idx_nutrition_food_idempotent 
  ON nutrition_food_entries(session_id, client_request_id) 
  WHERE client_request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_nutrition_drink_idempotent 
  ON nutrition_drink_entries(session_id, client_request_id) 
  WHERE client_request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_nutrition_coffee_idempotent 
  ON nutrition_coffee_entries(session_id, client_request_id) 
  WHERE client_request_id IS NOT NULL;