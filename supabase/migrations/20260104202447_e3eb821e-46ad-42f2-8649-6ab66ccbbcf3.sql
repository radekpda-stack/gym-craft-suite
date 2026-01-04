-- Add import filter tag column to calendar_ics_feeds
ALTER TABLE calendar_ics_feeds 
ADD COLUMN IF NOT EXISTS import_filter_tag text DEFAULT NULL;