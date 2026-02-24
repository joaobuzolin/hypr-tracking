
-- Fix get_campaign_counters: remove dangerous fallback to events table (50M+ rows)
-- When campaigns are not in the MV, return zeros instead of scanning events
CREATE OR REPLACE FUNCTION public.get_campaign_counters(campaign_ids uuid[])
 RETURNS TABLE(campaign_id uuid, page_views bigint, cta_clicks bigint, pin_clicks bigint, total_7d bigint, last_hour bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '10s'
AS $function$
BEGIN
  -- Return data from materialized view for campaigns that exist there
  -- For campaigns NOT in the MV, return zeros (the hourly refresh will populate them)
  RETURN QUERY
  SELECT 
    uid as campaign_id,
    COALESCE(cms.page_views, 0::bigint) as page_views,
    COALESCE(cms.cta_clicks, 0::bigint) as cta_clicks,
    COALESCE(cms.pin_clicks, 0::bigint) as pin_clicks,
    COALESCE(cms.total_7d, 0::bigint) as total_7d,
    COALESCE(cms.last_hour, 0::bigint) as last_hour
  FROM unnest(campaign_ids) AS uid
  LEFT JOIN campaign_metrics_summary cms ON cms.campaign_id = uid
  WHERE (auth.uid() IS NOT NULL);
END;
$function$;
