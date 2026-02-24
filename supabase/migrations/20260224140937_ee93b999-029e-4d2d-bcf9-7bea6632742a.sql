
-- Create separate refresh functions for each MV to allow independent refresh
-- This prevents one slow refresh from blocking the other

CREATE OR REPLACE FUNCTION public.refresh_campaign_metrics_summary()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '120s'
 SET lock_timeout TO '30s'
AS $function$
BEGIN
  IF NOT pg_try_advisory_lock(987654322) THEN
    RAISE NOTICE 'Summary refresh already running, skipping.';
    RETURN;
  END IF;

  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_metrics_summary;
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_advisory_unlock(987654322);
    RAISE;
  END;

  PERFORM pg_advisory_unlock(987654322);
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_campaign_metrics_daily()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '180s'
 SET lock_timeout TO '30s'
AS $function$
BEGIN
  IF NOT pg_try_advisory_lock(987654323) THEN
    RAISE NOTICE 'Daily refresh already running, skipping.';
    RETURN;
  END IF;

  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_metrics_daily;
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_advisory_unlock(987654323);
    RAISE;
  END;

  PERFORM pg_advisory_unlock(987654323);
END;
$function$;
