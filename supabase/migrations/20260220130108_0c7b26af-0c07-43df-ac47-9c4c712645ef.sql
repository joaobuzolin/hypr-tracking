
-- Update refresh function to wait longer for the lock
CREATE OR REPLACE FUNCTION public.refresh_campaign_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '300s'
SET lock_timeout TO '60s'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_metrics_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_metrics_daily;
END;
$function$;
