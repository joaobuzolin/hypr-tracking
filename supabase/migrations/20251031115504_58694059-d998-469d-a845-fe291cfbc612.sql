-- Drop existing materialized view if it exists
DROP MATERIALIZED VIEW IF EXISTS campaign_metrics_daily CASCADE;

-- Create Materialized View for daily campaign metrics (last 90 days)
CREATE MATERIALIZED VIEW campaign_metrics_daily AS
SELECT 
  t.campaign_id,
  DATE(e.created_at) as metric_date,
  COALESCE(SUM(CASE WHEN e.event_type = 'page_view' THEN 1 ELSE 0 END), 0) as page_views,
  COALESCE(SUM(CASE WHEN e.event_type = 'click' THEN 1 ELSE 0 END), 0) as cta_clicks,
  COALESCE(SUM(CASE WHEN e.event_type = 'pin_click' THEN 1 ELSE 0 END), 0) as pin_clicks,
  COALESCE(COUNT(*), 0) as total_events
FROM tags t
LEFT JOIN events e ON e.tag_id = t.id
WHERE e.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY t.campaign_id, DATE(e.created_at);

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX idx_campaign_metrics_daily_unique 
ON campaign_metrics_daily (campaign_id, metric_date);

-- Protect the view (access only via RPCs)
REVOKE ALL ON campaign_metrics_daily FROM anon, authenticated;
GRANT SELECT ON campaign_metrics_daily TO service_role;

-- Update refresh function to include both materialized views
CREATE OR REPLACE FUNCTION public.refresh_campaign_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_metrics_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_metrics_daily;
END;
$function$;

-- Update get_campaign_metrics to use the new materialized view
CREATE OR REPLACE FUNCTION public.get_campaign_metrics(
  campaign_id_param uuid, 
  start_date date DEFAULT NULL, 
  end_date date DEFAULT NULL
)
RETURNS TABLE(
  metric_date date, 
  page_views bigint, 
  cta_clicks bigint, 
  pin_clicks bigint, 
  total_events bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user has access to the campaign
  IF NOT EXISTS (
    SELECT 1 FROM campaigns c 
    WHERE c.id = campaign_id_param 
    AND (c.user_id = auth.uid() OR auth.uid() IS NOT NULL)
  ) THEN
    RETURN;
  END IF;

  -- Query from the pre-calculated materialized view
  RETURN QUERY
  SELECT 
    cm.metric_date,
    cm.page_views,
    cm.cta_clicks,
    cm.pin_clicks,
    cm.total_events
  FROM campaign_metrics_daily cm
  WHERE cm.campaign_id = campaign_id_param
    AND (start_date IS NULL OR cm.metric_date >= start_date)
    AND (end_date IS NULL OR cm.metric_date <= end_date)
  ORDER BY cm.metric_date DESC;
END;
$function$;