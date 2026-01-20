-- Add columns for RRULE support to calendar_ics_events
ALTER TABLE calendar_ics_events 
ADD COLUMN IF NOT EXISTS rrule text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS master_event_uid text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recurrence_instance_date date DEFAULT NULL;

-- Add index for faster lookup of related instances
CREATE INDEX IF NOT EXISTS idx_calendar_ics_events_master_uid 
ON calendar_ics_events(master_event_uid) WHERE master_event_uid IS NOT NULL;

-- Add sync horizon configuration to feeds
ALTER TABLE calendar_ics_feeds 
ADD COLUMN IF NOT EXISTS sync_horizon_months integer DEFAULT 3;

-- Comment for documentation
COMMENT ON COLUMN calendar_ics_events.rrule IS 'Original RRULE string from ICS for display purposes';
COMMENT ON COLUMN calendar_ics_events.master_event_uid IS 'Links recurring instances to their parent event UID';
COMMENT ON COLUMN calendar_ics_events.recurrence_instance_date IS 'The specific date of this recurring instance';
COMMENT ON COLUMN calendar_ics_feeds.sync_horizon_months IS 'How many months ahead to sync recurring events (1-12)';