CREATE OR REPLACE FUNCTION public.get_campaign_counters(campaign_ids uuid[])
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
    0::bigint as last_hour
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
  WHERE (auth.uid() IS NOT NULL);
END;
$$;