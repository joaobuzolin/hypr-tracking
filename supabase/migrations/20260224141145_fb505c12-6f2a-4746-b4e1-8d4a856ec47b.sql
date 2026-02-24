
-- Remove old conflicting/broken cron jobs
-- Job 3: direct refresh every 5 min without advisory locks (causes contention)
SELECT cron.unschedule(3);
-- Job 4: edge function refresh (always times out via HTTP)
SELECT cron.unschedule(4);
