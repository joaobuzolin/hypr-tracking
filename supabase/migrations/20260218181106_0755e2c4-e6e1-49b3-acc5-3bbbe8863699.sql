
-- Create fallback version of get_campaign_counters that checks events directly
-- when materialized view is missing data for campaigns
CREATE OR REPLACE FUNCTION public.get_campaign_counters(campaign_ids uuid[])
 RETURNS TABLE(campaign_id uuid, page_views bigint, cta_clicks bigint, pin_clicks bigint, total_7d bigint, last_hour bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  found_ids uuid[];
  missing_ids uuid[];
BEGIN
  -- First try materialized view (fast path)
  RETURN QUERY
  SELECT 
    cms.campaign_id,
    cms.page_views,
    cms.cta_clicks,
    cms.pin_clicks,
    cms.total_7d,
    cms.last_hour
  FROM campaign_metrics_summary cms
  WHERE cms.campaign_id = ANY(campaign_ids)
    AND (auth.uid() IS NOT NULL);

  -- Find which campaign_ids were NOT in the materialized view
  SELECT ARRAY_AGG(cid) INTO found_ids
  FROM campaign_metrics_summary cms2
  WHERE cms2.campaign_id = ANY(campaign_ids);

  -- Compute missing IDs
  SELECT ARRAY_AGG(cid) INTO missing_ids
  FROM unnest(campaign_ids) AS cid
  WHERE cid != ALL(COALESCE(found_ids, ARRAY[]::uuid[]));

  -- For missing campaigns, query events directly
  IF missing_ids IS NOT NULL AND array_length(missing_ids, 1) > 0 THEN
    RETURN QUERY
    SELECT
      t.campaign_id,
      COALESCE(SUM(CASE WHEN e.event_type = 'page_view' THEN 1 ELSE 0 END), 0)::bigint AS page_views,
      COALESCE(SUM(CASE WHEN e.event_type = 'click' THEN 1 ELSE 0 END), 0)::bigint AS cta_clicks,
      COALESCE(SUM(CASE WHEN e.event_type = 'pin_click' THEN 1 ELSE 0 END), 0)::bigint AS pin_clicks,
      COALESCE(SUM(CASE WHEN e.created_at >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END), 0)::bigint AS total_7d,
      COALESCE(SUM(CASE WHEN e.created_at >= NOW() - INTERVAL '1 hour' THEN 1 ELSE 0 END), 0)::bigint AS last_hour
    FROM tags t
    LEFT JOIN events e ON e.tag_id = t.id
    WHERE t.campaign_id = ANY(missing_ids)
      AND (auth.uid() IS NOT NULL)
    GROUP BY t.campaign_id;
  END IF;
END;
$function$;
