-- Fix SECURITY DEFINER views - recreate with security_invoker = true
DROP VIEW IF EXISTS vw_daily_error_counts;
DROP VIEW IF EXISTS vw_top_errors_24h;
DROP VIEW IF EXISTS vw_top_errors_7d;

-- 1. Daily error counts view (security invoker)
CREATE VIEW vw_daily_error_counts 
WITH (security_invoker = true)
AS
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

-- 2. Top error types view (24h, security invoker)
CREATE VIEW vw_top_errors_24h 
WITH (security_invoker = true)
AS
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

-- 3. Top error types view (7 days, security invoker)
CREATE VIEW vw_top_errors_7d 
WITH (security_invoker = true)
AS
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

-- Grant access to views
GRANT SELECT ON vw_daily_error_counts TO authenticated;
GRANT SELECT ON vw_top_errors_24h TO authenticated;
GRANT SELECT ON vw_top_errors_7d TO authenticated;

-- Add RLS policy for app_errors so authenticated users can view all errors (admin-only feature)
CREATE POLICY "Authenticated users can view all errors" ON public.app_errors
  FOR SELECT TO authenticated USING (true);