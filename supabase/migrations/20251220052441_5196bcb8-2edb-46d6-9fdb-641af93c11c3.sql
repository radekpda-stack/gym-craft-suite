-- Create table for external calendar events from Make.com
CREATE TABLE public.external_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  external_id text NOT NULL,
  title text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  all_day boolean DEFAULT false,
  source text DEFAULT 'make.com',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, external_id)
);

-- Enable RLS
ALTER TABLE public.external_calendar_events ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own events
CREATE POLICY "Users can view own external events" 
ON public.external_calendar_events 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- Policy for service role to insert/update/delete (webhook)
CREATE POLICY "Service role can manage all external events"
ON public.external_calendar_events
FOR ALL
USING (true)
WITH CHECK (true);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.external_calendar_events;

-- Create updated_at trigger
CREATE TRIGGER update_external_calendar_events_updated_at
BEFORE UPDATE ON public.external_calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();