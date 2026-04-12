
-- A) Remover trigger que tenta refresh na materialized view a cada insert
DROP TRIGGER IF EXISTS refresh_metrics_on_event ON events;
DROP FUNCTION IF EXISTS public.trigger_refresh_campaign_metrics();

-- B) Desativar cron que faz full scan a cada 30 min
SELECT cron.unschedule('refresh-metrics-summary');

-- C) Dropar materialized view nao usada pelo frontend
DROP MATERIALIZED VIEW IF EXISTS campaign_metrics_summary;
DROP FUNCTION IF EXISTS public.refresh_campaign_metrics_summary();
DROP FUNCTION IF EXISTS public.refresh_campaign_metrics();

-- D) Dropar indice quase nao usado (4.9 GB, 40 scans)
DROP INDEX IF EXISTS idx_events_type_created_at;

-- E) Remover trigger duplicado
DROP TRIGGER IF EXISTS prevent_duplicate_page_views_trigger ON events;

-- F) Aumentar timeout do refresh daily de 60s para 120s
CREATE OR REPLACE FUNCTION public.refresh_campaign_metrics_daily_incremental()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
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
  WHERE e.created_at >= CURRENT_DATE - INTERVAL '3 days'
  GROUP BY t.campaign_id, e.created_at::date
  ON CONFLICT (campaign_id, metric_date) DO UPDATE SET
    page_views = EXCLUDED.page_views,
    cta_clicks = EXCLUDED.cta_clicks,
    pin_clicks = EXCLUDED.pin_clicks,
    total_events = EXCLUDED.total_events;
END;
$$;
