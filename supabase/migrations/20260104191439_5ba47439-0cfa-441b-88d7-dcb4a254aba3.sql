-- Add new columns for import control workflow
ALTER TABLE calendar_ics_events 
ADD COLUMN IF NOT EXISTS skip_import boolean DEFAULT false;

ALTER TABLE calendar_ics_events 
ADD COLUMN IF NOT EXISTS import_approved boolean DEFAULT false;

ALTER TABLE calendar_ics_events 
ADD COLUMN IF NOT EXISTS potential_duplicate_session_id uuid REFERENCES training_sessions(id) ON DELETE SET NULL;

-- Add index for faster queries on import workflow
CREATE INDEX IF NOT EXISTS idx_calendar_ics_events_import_status 
ON calendar_ics_events(feed_id, is_processed, skip_import, import_approved);

-- Comment for documentation
COMMENT ON COLUMN calendar_ics_events.skip_import IS 'Mark event to be skipped during import (not a training)';
COMMENT ON COLUMN calendar_ics_events.import_approved IS 'Event has been reviewed and approved for import';
COMMENT ON COLUMN calendar_ics_events.potential_duplicate_session_id IS 'Reference to potentially duplicate training session';