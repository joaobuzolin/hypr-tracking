-- 1. Replace cleanup function with batched version
CREATE OR REPLACE FUNCTION public.cleanup_old_events()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '300s'
AS $$
DECLARE
  batch_size INT := 50000;
  deleted INT;
  total INT := 0;
BEGIN
  FOR i IN 1..10 LOOP
    DELETE FROM events WHERE id IN (
      SELECT id FROM events 
      WHERE created_at < NOW() - INTERVAL '90 days' 
      LIMIT batch_size
    );
    GET DIAGNOSTICS deleted = ROW_COUNT;
    total := total + deleted;
    EXIT WHEN deleted < batch_size;
    PERFORM pg_sleep(0.5);
  END LOOP;
  RAISE NOTICE 'Cleanup: deleted % rows', total;
END;
$$;

-- 2. Reschedule cron to 4x/day
SELECT cron.unschedule('cleanup-old-events');
SELECT cron.schedule(
  'cleanup-old-events',
  '0 */6 * * *',
  $$SELECT public.cleanup_old_events()$$
);