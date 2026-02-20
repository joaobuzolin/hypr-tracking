
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule hourly refresh of materialized views
SELECT cron.schedule(
  'refresh-materialized-views-hourly',
  '0 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://wmwpzmpgaokjplhyyktv.supabase.co/functions/v1/refresh-materialized-views',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtd3B6bXBnYW9ranBsaHl5a3R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MDE1MzcsImV4cCI6MjA3MjA3NzUzN30.UOD5ue0yNXKckgLRspHxCQtT9AIGtXeE7FVpmc8nl6M"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);
