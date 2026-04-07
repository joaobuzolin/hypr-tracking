
-- Create a backfill function that processes one campaign at a time
CREATE OR REPLACE FUNCTION backfill_campaign_metrics_daily(p_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '120s'
AS $$
BEGIN
  INSERT INTO campaign_metrics_daily (campaign_id, metric_date, page_views, cta_clicks, pin_clicks, total_events)
  SELECT 
    t.campaign_id,
    e.created_at::date as metric_date,
    COUNT(*) FILTER (WHERE e.event_type = 'page_view')::bigint as page_views,
    COUNT(*) FILTER (WHERE e.event_type = 'click')::bigint as cta_clicks,
    COUNT(*) FILTER (WHERE e.event_type = 'pin_click')::bigint as pin_clicks,
    COUNT(*)::bigint as total_events
  FROM events e
  JOIN tags t ON t.id = e.tag_id
  WHERE t.campaign_id = p_campaign_id
    AND e.created_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY t.campaign_id, e.created_at::date
  ON CONFLICT (campaign_id, metric_date) DO UPDATE SET
    page_views = EXCLUDED.page_views,
    cta_clicks = EXCLUDED.cta_clicks,
    pin_clicks = EXCLUDED.pin_clicks,
    total_events = EXCLUDED.total_events;
END;
$$;

-- Backfill all missing campaigns one by one
DO $$
DECLARE
  cid uuid;
BEGIN
  FOR cid IN 
    SELECT c.id FROM campaigns c 
    WHERE c.id NOT IN (SELECT DISTINCT campaign_id FROM campaign_metrics_daily)
  LOOP
    BEGIN
      PERFORM backfill_campaign_metrics_daily(cid);
      RAISE NOTICE 'Backfilled campaign %', cid;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to backfill campaign %: %', cid, SQLERRM;
    END;
  END LOOP;
END;
$$;
