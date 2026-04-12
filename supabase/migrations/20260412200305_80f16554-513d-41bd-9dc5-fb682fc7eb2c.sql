
CREATE OR REPLACE FUNCTION public.backfill_tag_metrics_daily()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '600s'
AS $$
DECLARE
  d date;
BEGIN
  FOR d IN SELECT generate_series(CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE, '1 day')::date
  LOOP
    INSERT INTO tag_metrics_daily (tag_id, campaign_id, metric_date, page_views, cta_clicks, pin_clicks, total_events)
    SELECT 
      e.tag_id, t.campaign_id, d,
      COUNT(*) FILTER (WHERE e.event_type = 'page_view')::bigint,
      COUNT(*) FILTER (WHERE e.event_type = 'click')::bigint,
      COUNT(*) FILTER (WHERE e.event_type = 'pin_click')::bigint,
      COUNT(*)::bigint
    FROM events e
    JOIN tags t ON t.id = e.tag_id
    WHERE e.created_at >= d AND e.created_at < d + INTERVAL '1 day'
    GROUP BY e.tag_id, t.campaign_id
    ON CONFLICT (tag_id, metric_date) DO UPDATE SET
      page_views = EXCLUDED.page_views,
      cta_clicks = EXCLUDED.cta_clicks,
      pin_clicks = EXCLUDED.pin_clicks,
      total_events = EXCLUDED.total_events;
  END LOOP;
END;
$$;
