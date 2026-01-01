-- Rozšíření tabulky feedback_requests o nové sloupce
ALTER TABLE public.feedback_requests 
  ADD COLUMN IF NOT EXISTS sent_to TEXT,
  ADD COLUMN IF NOT EXISTS link_url TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Přidat index pro rychlejší filtrování podle statusu a datumů
CREATE INDEX IF NOT EXISTS idx_feedback_requests_status_dates 
  ON public.feedback_requests(status, sent_at, expires_at, completed_at);

-- Vytvořit tabulku pro event log
CREATE TABLE IF NOT EXISTS public.feedback_event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_request_id UUID NOT NULL REFERENCES public.feedback_requests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('CREATED', 'COPIED', 'SENT', 'OPENED', 'SUBMITTED', 'EXPIRED', 'REJECTED', 'CANCELLED', 'STATUS_CHANGED')),
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pro rychlé vyhledávání podle feedback_request_id
CREATE INDEX IF NOT EXISTS idx_feedback_event_log_request_id 
  ON public.feedback_event_log(feedback_request_id);

-- Index pro rychlé vyhledávání podle event_type a času
CREATE INDEX IF NOT EXISTS idx_feedback_event_log_event_type_created 
  ON public.feedback_event_log(event_type, created_at);

-- Enable RLS
ALTER TABLE public.feedback_event_log ENABLE ROW LEVEL SECURITY;

-- RLS policies pro feedback_event_log
-- Trenéři mohou vidět logy pro své feedback requesty
CREATE POLICY "Users can view event logs for their feedback requests"
  ON public.feedback_event_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.feedback_requests fr
      WHERE fr.id = feedback_event_log.feedback_request_id
      AND fr.user_id = auth.uid()
    )
  );

-- Trenéři mohou vytvářet logy pro své feedback requesty
CREATE POLICY "Users can create event logs for their feedback requests"
  ON public.feedback_event_log
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.feedback_requests fr
      WHERE fr.id = feedback_event_log.feedback_request_id
      AND fr.user_id = auth.uid()
    )
  );

-- Service role může všechno (pro edge functions)
CREATE POLICY "Service role can manage all event logs"
  ON public.feedback_event_log
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Komentáře pro dokumentaci
COMMENT ON TABLE public.feedback_event_log IS 'Audit log pro všechny akce s feedback requesty';
COMMENT ON COLUMN public.feedback_event_log.event_type IS 'Typ události: CREATED, COPIED, SENT, OPENED, SUBMITTED, EXPIRED, REJECTED, CANCELLED, STATUS_CHANGED';
COMMENT ON COLUMN public.feedback_event_log.meta IS 'Metadata události: sent_via, sent_to, device, user_agent, reason, atd.';
COMMENT ON COLUMN public.feedback_requests.sent_to IS 'Kam byl odkaz odeslán (telefon/email)';
COMMENT ON COLUMN public.feedback_requests.link_url IS 'Plná URL odkazu pro feedback';
COMMENT ON COLUMN public.feedback_requests.rejected_at IS 'Kdy klient odmítl formulář (tlačítko "Tohle nejsem já")';
COMMENT ON COLUMN public.feedback_requests.rejection_reason IS 'Důvod odmítnutí feedbacku klientem';