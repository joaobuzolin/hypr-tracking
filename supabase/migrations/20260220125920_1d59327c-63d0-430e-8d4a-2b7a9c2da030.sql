
-- Optimize get_report_from_events with statement timeout and campaign limit
CREATE OR REPLACE FUNCTION public.get_report_from_events(
  p_campaign_ids uuid[] DEFAULT NULL::uuid[], 
  p_start_date date DEFAULT NULL::date, 
  p_end_date date DEFAULT NULL::date, 
  p_group_by text DEFAULT 'day'::text
)
RETURNS TABLE(
  period_start timestamp with time zone, 
  campaign_id uuid, 
  page_views bigint, 
  cta_clicks bigint, 
  pin_clicks bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '15s'
AS $function$
DECLARE
  start_date_filter date;
  end_date_filter date;
  limited_ids uuid[];
BEGIN
  start_date_filter := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
  end_date_filter := COALESCE(p_end_date, CURRENT_DATE);
  
  -- Limit to max 30 campaigns to prevent timeout on 50M+ events table
  IF p_campaign_ids IS NOT NULL AND array_length(p_campaign_ids, 1) > 30 THEN
    limited_ids := p_campaign_ids[1:30];
  ELSE
    limited_ids := p_campaign_ids;
  END IF;
  
  RETURN QUERY
  WITH campaign_tags AS (
    SELECT t.id as tag_id, t.campaign_id as cid
    FROM tags t
    WHERE (limited_ids IS NULL OR t.campaign_id = ANY(limited_ids))
  )
  SELECT 
    CASE p_group_by
      WHEN 'week' THEN date_trunc('week', e.created_at)
      WHEN 'month' THEN date_trunc('month', e.created_at)
      ELSE date_trunc('day', e.created_at)
    END as ps,
    ct.cid as cid2,
    COUNT(*) FILTER (WHERE e.event_type = 'page_view')::bigint as pv,
    COUNT(*) FILTER (WHERE e.event_type = 'click')::bigint as cc,
    COUNT(*) FILTER (WHERE e.event_type = 'pin_click')::bigint as pc
  FROM events e
  JOIN campaign_tags ct ON e.tag_id = ct.tag_id
  WHERE e.created_at >= start_date_filter
    AND e.created_at < (end_date_filter + INTERVAL '1 day')
    AND (auth.uid() IS NOT NULL)
  GROUP BY ps, cid2
  ORDER BY ps DESC, cid2;
END;
$function$;

-- Make the trigger less aggressive - only refresh MVs occasionally
CREATE OR REPLACE FUNCTION public.trigger_refresh_campaign_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '300s'
AS $function$
BEGIN
  -- Only refresh ~0.1% of the time to reduce lock contention
  IF random() < 0.001 AND pg_try_advisory_xact_lock(123456789) THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_metrics_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_metrics_daily;
  END IF;
  RETURN NEW;
END;
$function$;
