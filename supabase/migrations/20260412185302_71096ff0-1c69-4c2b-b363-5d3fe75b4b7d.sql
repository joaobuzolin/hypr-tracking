
SELECT cron.unschedule('cleanup-old-events');
SELECT cron.schedule('cleanup-old-events', '0 */6 * * *', 'SELECT public.cleanup_old_events()');
