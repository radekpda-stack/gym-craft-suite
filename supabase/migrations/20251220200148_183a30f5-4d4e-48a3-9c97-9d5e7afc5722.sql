-- Tabulka pro centrální sběr statistických událostí
CREATE TABLE public.stat_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('training', 'feedback', 'nutrition', 'health', 'finance', 'measurement')),
  event_name TEXT NOT NULL,
  value_numeric NUMERIC,
  value_text TEXT,
  unit TEXT,
  context_json JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexy pro rychlé dotazy
CREATE INDEX idx_stat_events_client_id ON public.stat_events(client_id);
CREATE INDEX idx_stat_events_session_id ON public.stat_events(session_id);
CREATE INDEX idx_stat_events_event_type ON public.stat_events(event_type);
CREATE INDEX idx_stat_events_event_name ON public.stat_events(event_name);
CREATE INDEX idx_stat_events_recorded_at ON public.stat_events(recorded_at);
CREATE INDEX idx_stat_events_user_id ON public.stat_events(user_id);

-- Kompozitní index pro běžné dotazy
CREATE INDEX idx_stat_events_client_type_date ON public.stat_events(client_id, event_type, recorded_at);

-- Enable RLS
ALTER TABLE public.stat_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own stat events"
ON public.stat_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stat events"
ON public.stat_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stat events"
ON public.stat_events FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stat events"
ON public.stat_events FOR DELETE
USING (auth.uid() = user_id);

-- Komentáře pro dokumentaci
COMMENT ON TABLE public.stat_events IS 'Centrální tabulka pro sběr všech statistických událostí pro AI analýzu';
COMMENT ON COLUMN public.stat_events.event_type IS 'Typ události: training, feedback, nutrition, health, finance, measurement';
COMMENT ON COLUMN public.stat_events.event_name IS 'Název události např. squat_set, sleep_score, knee_pain';
COMMENT ON COLUMN public.stat_events.context_json IS 'Detailní kontext události ve formátu JSON';