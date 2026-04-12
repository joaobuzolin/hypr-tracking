CREATE OR REPLACE FUNCTION public.get_campaign_counters(campaign_ids uuid[])
RETURNS TABLE(campaign_id uuid, page_views bigint, cta_clicks bigint, pin_clicks bigint, total_7d bigint, last_hour bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '10s'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH requested_campaigns AS (
    SELECT unnest(campaign_ids) AS campaign_id
  ),
  agg AS (
    SELECT
      cmd.campaign_id,
      SUM(cmd.page_views)::bigint AS page_views,
      SUM(cmd.cta_clicks)::bigint AS cta_clicks,
      SUM(cmd.pin_clicks)::bigint AS pin_clicks,
      SUM(
        CASE
          WHEN cmd.metric_date >= CURRENT_DATE - 7 THEN cmd.page_views + cmd.cta_clicks + cmd.pin_clicks
          ELSE 0
        END
      )::bigint AS total_7d
    FROM public.campaign_metrics_daily cmd
    WHERE cmd.campaign_id = ANY(campaign_ids)
    GROUP BY cmd.campaign_id
  ),
  relevant_tags AS (
    SELECT t.id, t.campaign_id
    FROM public.tags t
    WHERE t.campaign_id = ANY(campaign_ids)
  ),
  last_hour_counts AS (
    SELECT hourly.campaign_id, SUM(hourly.event_count)::bigint AS last_hour
    FROM (
      SELECT rt.campaign_id, COUNT(*)::bigint AS event_count
      FROM relevant_tags rt
      JOIN public.events e ON e.tag_id = rt.id
      WHERE e.event_type = 'page_view'
        AND e.created_at >= NOW() - INTERVAL '1 hour'
      GROUP BY rt.campaign_id

      UNION ALL

      SELECT rt.campaign_id, COUNT(*)::bigint AS event_count
      FROM relevant_tags rt
      JOIN public.events e ON e.tag_id = rt.id
      WHERE e.event_type = 'click'
        AND e.created_at >= NOW() - INTERVAL '1 hour'
      GROUP BY rt.campaign_id

      UNION ALL

      SELECT rt.campaign_id, COUNT(*)::bigint AS event_count
      FROM relevant_tags rt
      JOIN public.events e ON e.tag_id = rt.id
      WHERE e.event_type = 'pin_click'
        AND e.created_at >= NOW() - INTERVAL '1 hour'
      GROUP BY rt.campaign_id
    ) AS hourly
    GROUP BY hourly.campaign_id
  )
  SELECT
    rc.campaign_id,
    COALESCE(agg.page_views, 0::bigint),
    COALESCE(agg.cta_clicks, 0::bigint),
    COALESCE(agg.pin_clicks, 0::bigint),
    COALESCE(agg.total_7d, 0::bigint),
    COALESCE(lh.last_hour, 0::bigint)
  FROM requested_campaigns rc
  LEFT JOIN agg ON agg.campaign_id = rc.campaign_id
  LEFT JOIN last_hour_counts lh ON lh.campaign_id = rc.campaign_id;
END;
$function$;