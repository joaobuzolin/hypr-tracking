
-- Step 1: Save existing data from the MV before dropping it
CREATE TABLE IF NOT EXISTS campaign_metrics_daily_backup AS
  SELECT * FROM campaign_metrics_daily;

-- Step 2: Drop the materialized view (and dependent objects)
DROP MATERIALIZED VIEW IF EXISTS campaign_metrics_daily CASCADE;

-- Step 3: Create the regular table with same structure
CREATE TABLE campaign_metrics_daily (
  campaign_id uuid NOT NULL,
  metric_date date NOT NULL,
  page_views bigint NOT NULL DEFAULT 0,
  cta_clicks bigint NOT NULL DEFAULT 0,
  pin_clicks bigint NOT NULL DEFAULT 0,
  total_events bigint NOT NULL DEFAULT 0,
  CONSTRAINT campaign_metrics_daily_pkey PRIMARY KEY (campaign_id, metric_date)
);

-- Step 4: Create indexes for performance
CREATE INDEX idx_cmd_campaign_id ON campaign_metrics_daily(campaign_id);
CREATE INDEX idx_cmd_metric_date ON campaign_metrics_daily(metric_date);

-- Step 5: Restore data from backup
INSERT INTO campaign_metrics_daily (campaign_id, metric_date, page_views, cta_clicks, pin_clicks, total_events)
SELECT campaign_id, metric_date, 
  COALESCE(page_views, 0), 
  COALESCE(cta_clicks, 0), 
  COALESCE(pin_clicks, 0), 
  COALESCE(total_events, 0)
FROM campaign_metrics_daily_backup
WHERE campaign_id IS NOT NULL AND metric_date IS NOT NULL
ON CONFLICT (campaign_id, metric_date) DO NOTHING;

-- Step 6: Drop backup table
DROP TABLE IF EXISTS campaign_metrics_daily_backup;

-- Step 7: Enable RLS and add policy for authenticated reads
ALTER TABLE campaign_metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view campaign_metrics_daily"
  ON campaign_metrics_daily FOR SELECT
  TO authenticated
  USING (true);

-- Step 8: Create incremental refresh function (processes only last 3 days)
CREATE OR REPLACE FUNCTION refresh_campaign_metrics_daily_incremental()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '60s'
AS $$
BEGIN
  -- Only process last 3 days (covers gaps from missed refreshes)
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

-- Step 9: Replace the old refresh function to call incremental version
CREATE OR REPLACE FUNCTION refresh_campaign_metrics_daily()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '60s'
AS $$
BEGIN
  IF NOT pg_try_advisory_lock(987654323) THEN
    RAISE NOTICE 'Daily refresh already running, skipping.';
    RETURN;
  END IF;

  BEGIN
    PERFORM refresh_campaign_metrics_daily_incremental();
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_advisory_unlock(987654323);
    RAISE;
  END;

  PERFORM pg_advisory_unlock(987654323);
END;
$$;

-- Step 10: Update get_report_aggregated to use the table instead of events
CREATE OR REPLACE FUNCTION get_report_aggregated(
  p_campaign_ids uuid[] DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_group_by text DEFAULT 'day',
  p_breakdown_by_tags boolean DEFAULT false
)
RETURNS TABLE(
  period_start timestamptz,
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
    -- Tag breakdown still needs events table (but with date filter it's manageable)
    RETURN QUERY
    SELECT 
      CASE p_group_by
        WHEN 'week' THEN date_trunc('week', e.created_at)
        WHEN 'month' THEN date_trunc('month', e.created_at)
        ELSE date_trunc('day', e.created_at)
      END as period_start,
      t.campaign_id,
      t.id as tag_id,
      t.title as tag_title,
      COUNT(*) FILTER (WHERE e.event_type = 'page_view')::bigint as page_views,
      COUNT(*) FILTER (WHERE e.event_type = 'click')::bigint as cta_clicks,
      COUNT(*) FILTER (WHERE e.event_type = 'pin_click')::bigint as pin_clicks
    FROM tags t
    JOIN events e ON t.id = e.tag_id
    WHERE (auth.uid() IS NOT NULL)
      AND (p_campaign_ids IS NULL OR t.campaign_id = ANY(p_campaign_ids))
      AND e.created_at >= start_date_filter
      AND e.created_at < (end_date_filter + INTERVAL '1 day')
    GROUP BY 1, t.campaign_id, t.id, t.title
    HAVING COUNT(*) FILTER (WHERE e.event_type IN ('page_view','click','pin_click')) > 0
    ORDER BY period_start DESC, t.campaign_id, t.title;
  ELSE
    -- Non-tag breakdown: use the campaign_metrics_daily table (fast!)
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

-- Step 11: Update get_campaign_counters to work with the table (same logic, just confirming)
CREATE OR REPLACE FUNCTION get_campaign_counters(campaign_ids uuid[])
RETURNS TABLE(
  campaign_id uuid,
  page_views bigint,
  cta_clicks bigint,
  pin_clicks bigint,
  total_7d bigint,
  last_hour bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '10s'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    uid as campaign_id,
    COALESCE(agg.page_views, 0::bigint),
    COALESCE(agg.cta_clicks, 0::bigint),
    COALESCE(agg.pin_clicks, 0::bigint),
    COALESCE(agg.total_7d, 0::bigint),
    COALESCE(lh.last_hour, 0::bigint)
  FROM unnest(campaign_ids) AS uid
  LEFT JOIN (
    SELECT
      cmd.campaign_id,
      SUM(cmd.page_views)::bigint as page_views,
      SUM(cmd.cta_clicks)::bigint as cta_clicks,
      SUM(cmd.pin_clicks)::bigint as pin_clicks,
      SUM(CASE WHEN cmd.metric_date >= CURRENT_DATE - INTERVAL '7 days'
          THEN cmd.page_views + cmd.cta_clicks + cmd.pin_clicks ELSE 0 END)::bigint as total_7d
    FROM campaign_metrics_daily cmd
    WHERE cmd.campaign_id = ANY(campaign_ids)
    GROUP BY cmd.campaign_id
  ) agg ON agg.campaign_id = uid
  LEFT JOIN (
    SELECT
      t.campaign_id,
      COUNT(*)::bigint as last_hour
    FROM events e
    JOIN tags t ON t.id = e.tag_id
    WHERE t.campaign_id = ANY(campaign_ids)
      AND e.created_at >= NOW() - INTERVAL '1 hour'
    GROUP BY t.campaign_id
  ) lh ON lh.campaign_id = uid
  WHERE (auth.uid() IS NOT NULL);
END;
$$;

-- Step 12: Update get_campaign_metrics to work with the table
CREATE OR REPLACE FUNCTION get_campaign_metrics(
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
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    cmd.metric_date,
    cmd.page_views,
    cmd.cta_clicks,
    cmd.pin_clicks,
    cmd.total_events
  FROM campaign_metrics_daily cmd
  WHERE cmd.campaign_id = campaign_id_param
    AND (start_date IS NULL OR cmd.metric_date >= start_date)
    AND (end_date IS NULL OR cmd.metric_date <= end_date)
  ORDER BY cmd.metric_date DESC;
END;
$$;

-- Step 13: Update trigger function to not try refreshing MVs
CREATE OR REPLACE FUNCTION trigger_refresh_campaign_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '60s'
AS $$
BEGIN
  -- Only refresh ~0.1% of the time to reduce lock contention
  IF random() < 0.001 AND pg_try_advisory_xact_lock(123456789) THEN
    PERFORM refresh_campaign_metrics_daily_incremental();
    REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_metrics_summary;
  END IF;
  RETURN NEW;
END;
$$;

-- Step 14: Run incremental refresh immediately to populate missing campaigns
SELECT refresh_campaign_metrics_daily_incremental();
