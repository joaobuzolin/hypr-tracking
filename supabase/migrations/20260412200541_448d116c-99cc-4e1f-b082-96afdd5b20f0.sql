
CREATE OR REPLACE FUNCTION public.backfill_tag_metrics_batch(p_start date, p_end date)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '120s'
AS $$
DECLARE
  d date;
  total_rows bigint := 0;
  batch_rows bigint;
BEGIN
  FOR d IN SELECT generate_series(p_start, p_end, '1 day')::date
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
    GET DIAGNOSTICS batch_rows = ROW_COUNT;
    total_rows := total_rows + batch_rows;
  END LOOP;
  RETURN 'Inserted ' || total_rows || ' rows from ' || p_start || ' to ' || p_end;
END;
$$;
