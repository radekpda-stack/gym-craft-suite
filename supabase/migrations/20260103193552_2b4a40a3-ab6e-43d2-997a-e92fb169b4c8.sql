-- Add source_ics_event_id to training_sessions to link back to calendar events
ALTER TABLE training_sessions 
ADD COLUMN IF NOT EXISTS source_ics_event_id UUID REFERENCES calendar_ics_events(id) ON DELETE SET NULL;

-- Make client_id nullable for unassigned sessions from calendar
ALTER TABLE training_sessions 
ALTER COLUMN client_id DROP NOT NULL;

-- Index for quickly finding unassigned sessions
CREATE INDEX IF NOT EXISTS idx_training_sessions_unassigned 
ON training_sessions(user_id, date) 
WHERE client_id IS NULL;

-- Index for finding sessions by source event
CREATE INDEX IF NOT EXISTS idx_training_sessions_source_ics_event 
ON training_sessions(source_ics_event_id) 
WHERE source_ics_event_id IS NOT NULL;