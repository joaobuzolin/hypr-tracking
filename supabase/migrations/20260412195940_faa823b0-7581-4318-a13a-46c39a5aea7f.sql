
-- 1. Criar tabela tag_metrics_daily
CREATE TABLE public.tag_metrics_daily (
  tag_id uuid NOT NULL,
  campaign_id uuid NOT NULL,
  metric_date date NOT NULL,
  page_views bigint NOT NULL DEFAULT 0,
  cta_clicks bigint NOT NULL DEFAULT 0,
  pin_clicks bigint NOT NULL DEFAULT 0,
  total_events bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (tag_id, metric_date)
);

CREATE INDEX idx_tag_metrics_daily_campaign_date ON public.tag_metrics_daily (campaign_id, metric_date);

ALTER TABLE public.tag_metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tag_metrics_daily"
ON public.tag_metrics_daily
FOR SELECT
TO authenticated
USING (true);

-- 2. Atualizar refresh incremental para tambem popular tag_metrics_daily
CREATE OR REPLACE FUNCTION public.refresh_campaign_metrics_daily_incremental()
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
    COUNT(*) FILTER (WHERE e.event_type = 'page_view')::bigint,
    COUNT(*) FILTER (WHERE e.event_type = 'click')::bigint,
    COUNT(*) FILTER (WHERE e.event_type = 'pin_click')::bigint,
    COUNT(*)::bigint
  FROM events e
  JOIN tags t ON t.id = e.tag_id
  WHERE e.created_at >= CURRENT_DATE - INTERVAL '3 days'
  GROUP BY t.campaign_id, e.created_at::date
  ON CONFLICT (campaign_id, metric_date) DO UPDATE SET
    page_views = EXCLUDED.page_views,
    cta_clicks = EXCLUDED.cta_clicks,
    pin_clicks = EXCLUDED.pin_clicks,
    total_events = EXCLUDED.total_events;

  INSERT INTO tag_metrics_daily (tag_id, campaign_id, metric_date, page_views, cta_clicks, pin_clicks, total_events)
  SELECT 
    e.tag_id,
    t.campaign_id,
    e.created_at::date as metric_date,
    COUNT(*) FILTER (WHERE e.event_type = 'page_view')::bigint,
    COUNT(*) FILTER (WHERE e.event_type = 'click')::bigint,
    COUNT(*) FILTER (WHERE e.event_type = 'pin_click')::bigint,
    COUNT(*)::bigint
  FROM events e
  JOIN tags t ON t.id = e.tag_id
  WHERE e.created_at >= CURRENT_DATE - INTERVAL '3 days'
  GROUP BY e.tag_id, t.campaign_id, e.created_at::date
  ON CONFLICT (tag_id, metric_date) DO UPDATE SET
    campaign_id = EXCLUDED.campaign_id,
    page_views = EXCLUDED.page_views,
    cta_clicks = EXCLUDED.cta_clicks,
    pin_clicks = EXCLUDED.pin_clicks,
    total_events = EXCLUDED.total_events;
END;
$$;

-- 3. Atualizar get_report_aggregated para usar tag_metrics_daily
CREATE OR REPLACE FUNCTION public.get_report_aggregated(
  p_campaign_ids uuid[] DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_group_by text DEFAULT 'day',
  p_breakdown_by_tags boolean DEFAULT false
)
RETURNS TABLE(
  period_start timestamp with time zone,
  campaign_id uuid,
  tag_id uuid,
  tag_title text,
  page_views bigint,
  cta_clicks bigint,
  pin_clicks bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '15s'
AS $$
DECLARE
  start_date_filter date;
  end_date_filter date;
BEGIN
  start_date_filter := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
  end_date_filter := COALESCE(p_end_date, CURRENT_DATE);

  IF p_breakdown_by_tags THEN
    RETURN QUERY
    SELECT 
      CASE p_group_by
        WHEN 'week' THEN date_trunc('week', tmd.metric_date::timestamp AT TIME ZONE 'UTC')
        WHEN 'month' THEN date_trunc('month', tmd.metric_date::timestamp AT TIME ZONE 'UTC')
        ELSE date_trunc('day', tmd.metric_date::timestamp AT TIME ZONE 'UTC')
      END as period_start,
      tmd.campaign_id,
      tmd.tag_id,
      t.title as tag_title,
      SUM(tmd.page_views)::bigint as page_views,
      SUM(tmd.cta_clicks)::bigint as cta_clicks,
      SUM(tmd.pin_clicks)::bigint as pin_clicks
    FROM tag_metrics_daily tmd
    JOIN tags t ON t.id = tmd.tag_id
    WHERE (auth.uid() IS NOT NULL)
      AND (p_campaign_ids IS NULL OR tmd.campaign_id = ANY(p_campaign_ids))
      AND tmd.metric_date >= start_date_filter
      AND tmd.metric_date <= end_date_filter
    GROUP BY 1, tmd.campaign_id, tmd.tag_id, t.title
    HAVING SUM(tmd.page_views + tmd.cta_clicks + tmd.pin_clicks) > 0
    ORDER BY period_start DESC, tmd.campaign_id, t.title;
  ELSE
    RETURN QUERY
    SELECT 
      CASE p_group_by
        WHEN 'week' THEN date_trunc('week', cmd.metric_date::timestamp AT TIME ZONE 'UTC')
        WHEN 'month' THEN date_trunc('month', cmd.metric_date::timestamp AT TIME ZONE 'UTC')
        ELSE date_trunc('day', cmd.metric_date::timestamp AT TIME ZONE 'UTC')
      END as period_start,
      cmd.campaign_id,
      NULL::uuid as tag_id,
      NULL::text as tag_title,
      SUM(cmd.page_views)::bigint as page_views,
      SUM(cmd.cta_clicks)::bigint as cta_clicks,
      SUM(cmd.pin_clicks)::bigint as pin_clicks
    FROM campaign_metrics_daily cmd
    WHERE (auth.uid() IS NOT NULL)
      AND (p_campaign_ids IS NULL OR cmd.campaign_id = ANY(p_campaign_ids))
      AND cmd.metric_date >= start_date_filter
      AND cmd.metric_date <= end_date_filter
    GROUP BY 1, cmd.campaign_id
    HAVING SUM(cmd.page_views + cmd.cta_clicks + cmd.pin_clicks) > 0
    ORDER BY period_start DESC, cmd.campaign_id;
  END IF;
END;
$$;
