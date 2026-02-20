
CREATE OR REPLACE FUNCTION public.refresh_campaign_metrics()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '300s'
 SET lock_timeout TO '120s'
AS $function$
BEGIN
  -- Try to acquire advisory lock to prevent concurrent refreshes
  IF NOT pg_try_advisory_lock(987654321) THEN
    RAISE NOTICE 'Another refresh is already running, skipping.';
    RETURN;
  END IF;

  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_metrics_daily;
    REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_metrics_summary;
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_advisory_unlock(987654321);
    RAISE;
  END;

  PERFORM pg_advisory_unlock(987654321);
END;
$function$;
