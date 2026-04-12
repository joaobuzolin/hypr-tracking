
CREATE OR REPLACE FUNCTION public.refresh_campaign_metrics_daily_incremental()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '180s'
AS $$
BEGIN
  INSERT INTO campaign_metrics_daily (campaign_id, metric_date, page_views, cta_clicks, pin_clicks, total_events)
  SELECT 
    t.campaign_id, e.created_at::date,
    COUNT(*) FILTER (WHERE e.event_type = 'page_view')::bigint,
    COUNT(*) FILTER (WHERE e.event_type = 'click')::bigint,
    COUNT(*) FILTER (WHERE e.event_type = 'pin_click')::bigint,
    COUNT(*)::bigint
  FROM events e JOIN tags t ON t.id = e.tag_id
  WHERE e.created_at >= CURRENT_DATE - INTERVAL '3 days'
  GROUP BY t.campaign_id, e.created_at::date
  ON CONFLICT (campaign_id, metric_date) DO UPDATE SET
    page_views = EXCLUDED.page_views, cta_clicks = EXCLUDED.cta_clicks,
    pin_clicks = EXCLUDED.pin_clicks, total_events = EXCLUDED.total_events;

  INSERT INTO tag_metrics_daily (tag_id, campaign_id, metric_date, page_views, cta_clicks, pin_clicks, total_events)
  SELECT 
    e.tag_id, t.campaign_id, e.created_at::date,
    COUNT(*) FILTER (WHERE e.event_type = 'page_view')::bigint,
    COUNT(*) FILTER (WHERE e.event_type = 'click')::bigint,
    COUNT(*) FILTER (WHERE e.event_type = 'pin_click')::bigint,
    COUNT(*)::bigint
  FROM events e JOIN tags t ON t.id = e.tag_id
  WHERE e.created_at >= CURRENT_DATE - INTERVAL '3 days'
  GROUP BY e.tag_id, t.campaign_id, e.created_at::date
  ON CONFLICT (tag_id, metric_date) DO UPDATE SET
    campaign_id = EXCLUDED.campaign_id, page_views = EXCLUDED.page_views,
    cta_clicks = EXCLUDED.cta_clicks, pin_clicks = EXCLUDED.pin_clicks,
    total_events = EXCLUDED.total_events;
END;
$$;

CREATE OR REPLACE FUNCTION public.backfill_tag_metrics_single_day(p_day date)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '90s'
AS $$
DECLARE
  affected_rows bigint := 0;
BEGIN
  INSERT INTO public.tag_metrics_daily (tag_id, campaign_id, metric_date, page_views, cta_clicks, pin_clicks, total_events)
  SELECT e.tag_id, t.campaign_id, p_day,
    COUNT(*) FILTER (WHERE e.event_type = 'page_view')::bigint,
    COUNT(*) FILTER (WHERE e.event_type = 'click')::bigint,
    COUNT(*) FILTER (WHERE e.event_type = 'pin_click')::bigint,
    COUNT(*)::bigint
  FROM public.events e JOIN public.tags t ON t.id = e.tag_id
  WHERE e.created_at >= p_day AND e.created_at < p_day + INTERVAL '1 day'
  GROUP BY e.tag_id, t.campaign_id
  ON CONFLICT (tag_id, metric_date) DO UPDATE SET
    campaign_id = EXCLUDED.campaign_id, page_views = EXCLUDED.page_views,
    cta_clicks = EXCLUDED.cta_clicks, pin_clicks = EXCLUDED.pin_clicks,
    total_events = EXCLUDED.total_events;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$;
