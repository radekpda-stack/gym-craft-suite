-- Add template snapshot to nutrition_log_sessions
-- This captures the template settings at the time of campaign creation
-- so changes to the default template don't affect running campaigns

ALTER TABLE nutrition_log_sessions
ADD COLUMN IF NOT EXISTS template_snapshot jsonb DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN nutrition_log_sessions.template_snapshot IS 'Snapshot of template settings at campaign creation time. Contains meal_categories, drink_categories, coffee_types, quality_options, intro_message, thank_you_message';

-- Add expected entries tracking
ALTER TABLE nutrition_log_sessions
ADD COLUMN IF NOT EXISTS expected_entries_per_day integer DEFAULT 3;

COMMENT ON COLUMN nutrition_log_sessions.expected_entries_per_day IS 'Expected number of food entries per day for completion tracking';

-- Add trainer notes for campaigns
ALTER TABLE nutrition_log_sessions
ADD COLUMN IF NOT EXISTS trainer_notes text DEFAULT NULL;

COMMENT ON COLUMN nutrition_log_sessions.trainer_notes IS 'Trainer notes and observations for this campaign';