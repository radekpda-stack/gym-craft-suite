-- Create calendar_ics_feeds table for storing ICS feed URLs
CREATE TABLE IF NOT EXISTS public.calendar_ics_feeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Apple Calendar',
  ics_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_status TEXT, -- 'success', 'error', 'pending'
  last_sync_error TEXT,
  events_synced INTEGER DEFAULT 0,
  sync_from_date DATE, -- Only sync events from this date forward
  auto_create_sessions BOOLEAN DEFAULT true,
  default_duration INTEGER DEFAULT 60, -- minutes
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_ics_feeds ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own feeds" 
ON public.calendar_ics_feeds 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own feeds" 
ON public.calendar_ics_feeds 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feeds" 
ON public.calendar_ics_feeds 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feeds" 
ON public.calendar_ics_feeds 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create calendar_ics_events for tracking synced events
CREATE TABLE IF NOT EXISTS public.calendar_ics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_id UUID NOT NULL REFERENCES calendar_ics_feeds(id) ON DELETE CASCADE,
  ics_uid TEXT NOT NULL, -- Unique ID from the ICS event
  summary TEXT, -- Event title
  description TEXT,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE,
  location TEXT,
  matched_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  training_session_id UUID REFERENCES training_sessions(id) ON DELETE SET NULL,
  is_processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(feed_id, ics_uid)
);

-- Enable RLS
ALTER TABLE public.calendar_ics_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for events (through feed ownership)
CREATE POLICY "Users can view events from their feeds" 
ON public.calendar_ics_events 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM calendar_ics_feeds 
  WHERE id = feed_id AND user_id = auth.uid()
));

CREATE POLICY "Users can manage events from their feeds" 
ON public.calendar_ics_events 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM calendar_ics_feeds 
  WHERE id = feed_id AND user_id = auth.uid()
));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_calendar_ics_feeds_user_id ON calendar_ics_feeds(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_ics_events_feed_id ON calendar_ics_events(feed_id);
CREATE INDEX IF NOT EXISTS idx_calendar_ics_events_start_at ON calendar_ics_events(start_at);
CREATE INDEX IF NOT EXISTS idx_calendar_ics_events_matched_client ON calendar_ics_events(matched_client_id);