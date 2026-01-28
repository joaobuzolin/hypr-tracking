CREATE OR REPLACE FUNCTION public.get_report_from_events(
  p_campaign_ids uuid[] DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_group_by text DEFAULT 'day'
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
AS $$
DECLARE
  start_date_filter date;
  end_date_filter date;
BEGIN
  start_date_filter := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
  end_date_filter := COALESCE(p_end_date, CURRENT_DATE);
  
  RETURN QUERY
  WITH campaign_tags AS (
    SELECT t.id as tag_id, t.campaign_id as cid
    FROM tags t
    WHERE (p_campaign_ids IS NULL OR t.campaign_id = ANY(p_campaign_ids))
  )
  SELECT 
    CASE p_group_by
      WHEN 'week' THEN date_trunc('week', e.created_at)
      WHEN 'month' THEN date_trunc('month', e.created_at)
      ELSE date_trunc('day', e.created_at)
    END as period_start,
    ct.cid as campaign_id,
    COUNT(*) FILTER (WHERE e.event_type = 'page_view')::bigint as page_views,
    COUNT(*) FILTER (WHERE e.event_type = 'click')::bigint as cta_clicks,
    COUNT(*) FILTER (WHERE e.event_type = 'pin_click')::bigint as pin_clicks
  FROM events e
  JOIN campaign_tags ct ON e.tag_id = ct.tag_id
  WHERE e.created_at >= start_date_filter
    AND e.created_at < (end_date_filter + INTERVAL '1 day')
    AND (auth.uid() IS NOT NULL)
  GROUP BY 
    CASE p_group_by
      WHEN 'week' THEN date_trunc('week', e.created_at)
      WHEN 'month' THEN date_trunc('month', e.created_at)
      ELSE date_trunc('day', e.created_at)
    END,
    ct.cid
  ORDER BY period_start DESC, ct.cid;
END;
$$;