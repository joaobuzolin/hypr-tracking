
-- Enable pg_cron for direct in-database scheduling (no HTTP timeout issues)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule MV refreshes directly in the database (bypasses HTTP timeout)
-- Refresh summary every 30 minutes (smaller, used for counters)
SELECT cron.schedule(
  'refresh-metrics-summary',
  '*/30 * * * *',
  $$
  SELECT public.refresh_campaign_metrics_summary();
  $$
);

-- Refresh daily every hour (larger, used for reports)
SELECT cron.schedule(
  'refresh-metrics-daily',
  '0 * * * *',
  $$
  SELECT public.refresh_campaign_metrics_daily();
  $$
);
