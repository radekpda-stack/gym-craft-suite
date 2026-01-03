-- Add column for additional matched clients (for group trainings)
ALTER TABLE public.calendar_ics_events 
ADD COLUMN additional_matched_client_ids UUID[] DEFAULT '{}';

-- Add index for faster lookups
CREATE INDEX idx_calendar_ics_events_additional_clients 
ON public.calendar_ics_events USING GIN(additional_matched_client_ids);