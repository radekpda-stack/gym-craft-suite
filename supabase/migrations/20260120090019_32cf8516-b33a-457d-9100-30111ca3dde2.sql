-- Add last_sync_log column to calendar_ics_feeds for storing structured sync statistics
ALTER TABLE calendar_ics_feeds 
ADD COLUMN IF NOT EXISTS last_sync_log JSONB DEFAULT NULL;