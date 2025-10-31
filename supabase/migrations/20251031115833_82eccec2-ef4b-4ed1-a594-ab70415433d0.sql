-- Create a function to refresh materialized views with debounce logic
-- This uses advisory locks to prevent concurrent refreshes
CREATE OR REPLACE FUNCTION public.trigger_refresh_campaign_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Try to acquire an advisory lock (non-blocking)
  -- This prevents multiple simultaneous refreshes
  IF pg_try_advisory_xact_lock(123456789) THEN
    -- Refresh both materialized views concurrently
    -- CONCURRENTLY allows reads during refresh
    REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_metrics_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_metrics_daily;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger on events table to auto-refresh metrics
-- AFTER INSERT ensures the event is committed before refresh
-- FOR EACH STATEMENT (not ROW) reduces refresh frequency on bulk inserts
DROP TRIGGER IF EXISTS refresh_metrics_on_event ON events;
CREATE TRIGGER refresh_metrics_on_event
  AFTER INSERT ON events
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_campaign_metrics();

-- Perform immediate refresh to sync current data
REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_metrics_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_metrics_daily;