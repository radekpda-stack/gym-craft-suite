-- =============================================
-- DIAGNOSTICS v1.1 - Retention & Aggregation
-- =============================================

-- 1. Create app_events table (if not exists)
CREATE TABLE IF NOT EXISTS public.app_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  category TEXT NOT NULL,
  user_id UUID,
  session_id UUID,
  timestamp TIMESTAMPTZ DEFAULT now(),
  duration_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  error_code TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own events
CREATE POLICY "Users can view own events" ON public.app_events
  FOR SELECT USING (auth.uid() = user_id);

-- Index for retention cleanup
CREATE INDEX IF NOT EXISTS idx_app_events_created_at ON public.app_events (created_at);
CREATE INDEX IF NOT EXISTS idx_app_events_category ON public.app_events (category, created_at DESC);

-- Index for app_errors retention cleanup
CREATE INDEX IF NOT EXISTS idx_app_errors_created_at ON public.app_errors (created_at);
CREATE INDEX IF NOT EXISTS idx_app_errors_type ON public.app_errors (error_type, created_at DESC);

-- 2. Retention cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_diagnostics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_events INTEGER := 0;
  deleted_errors INTEGER := 0;
BEGIN
  -- Delete app_events older than 60 days
  WITH deleted AS (
    DELETE FROM public.app_events
    WHERE created_at < (NOW() - INTERVAL '60 days')
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_events FROM deleted;
  
  -- Delete app_errors older than 90 days
  WITH deleted AS (
    DELETE FROM public.app_errors
    WHERE created_at < (NOW() - INTERVAL '90 days')
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_errors FROM deleted;
  
  -- Log the cleanup action
  INSERT INTO public.audit_log (
    action, table_name, record_id, new_data
  ) VALUES (
    'retention_cleanup',
    'diagnostics',
    'system',
    jsonb_build_object(
      'deleted_events', deleted_events,
      'deleted_errors', deleted_errors,
      'ran_at', NOW()
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_events', deleted_events,
    'deleted_errors', deleted_errors,
    'ran_at', NOW()
  );
END;
$$;

-- 3. Daily error counts view
CREATE OR REPLACE VIEW vw_daily_error_counts AS
SELECT 
  DATE(created_at) as error_date,
  error_type,
  COUNT(*) as error_count,
  COUNT(DISTINCT user_id) as affected_users,
  COUNT(DISTINCT session_id) as affected_sessions
FROM public.app_errors
WHERE created_at > (NOW() - INTERVAL '30 days')
GROUP BY DATE(created_at), error_type
ORDER BY error_date DESC, error_count DESC;

-- 4. Top error types view (24h)
CREATE OR REPLACE VIEW vw_top_errors_24h AS
SELECT 
  error_type,
  message,
  screen,
  COUNT(*) as occurrence_count,
  MAX(created_at) as last_seen,
  MIN(created_at) as first_seen,
  COUNT(DISTINCT user_id) as unique_users
FROM public.app_errors
WHERE created_at > (NOW() - INTERVAL '24 hours')
GROUP BY error_type, message, screen
ORDER BY occurrence_count DESC
LIMIT 20;

-- 5. Top error types view (7 days)
CREATE OR REPLACE VIEW vw_top_errors_7d AS
SELECT 
  error_type,
  message,
  screen,
  COUNT(*) as occurrence_count,
  MAX(created_at) as last_seen,
  MIN(created_at) as first_seen,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT DATE(created_at)) as days_occurring
FROM public.app_errors
WHERE created_at > (NOW() - INTERVAL '7 days')
GROUP BY error_type, message, screen
ORDER BY occurrence_count DESC
LIMIT 50;

-- 6. Grant access to views for authenticated users
GRANT SELECT ON vw_daily_error_counts TO authenticated;
GRANT SELECT ON vw_top_errors_24h TO authenticated;
GRANT SELECT ON vw_top_errors_7d TO authenticated;