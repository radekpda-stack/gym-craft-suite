-- Schedule daily-financial-audit to run at 02:00 every day
-- This automatically fixes any balance discrepancies between the ledger and stored balances
SELECT cron.schedule(
  'daily-financial-audit',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url:='https://zukmwqfqmfuyqpxfjqil.supabase.co/functions/v1/daily-financial-audit',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1a213cWZxbWZ1eXFweGZqcWlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MjczOTYsImV4cCI6MjA4MDQwMzM5Nn0.Xey2TEztsVDhdglTTLFcEFdGF5WNmmbGc71AIm3OKwM"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);