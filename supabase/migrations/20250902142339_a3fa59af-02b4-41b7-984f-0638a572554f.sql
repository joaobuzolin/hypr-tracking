-- Create RPC function to get real-time event counts without row limits
CREATE OR REPLACE FUNCTION public.get_realtime_event_counts(
  p_tag_ids uuid[],
  p_since timestamptz
)
RETURNS TABLE(
  tag_id uuid,
  page_views bigint,
  clicks bigint,
  pin_clicks bigint,
  last_event timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    t.id as tag_id,
    COALESCE(SUM(CASE 
      WHEN e.event_type IN ('page_view', 'view') THEN 1 
      ELSE 0 
    END), 0) as page_views,
    COALESCE(SUM(CASE 
      WHEN e.event_type = 'click' THEN 1 
      ELSE 0 
    END), 0) as clicks,
    COALESCE(SUM(CASE 
      WHEN e.event_type = 'pin_click' THEN 1 
      ELSE 0 
    END), 0) as pin_clicks,
    MAX(e.created_at) as last_event
  FROM unnest(p_tag_ids) AS t(id)
  LEFT JOIN events e ON e.tag_id = t.id 
    AND e.created_at >= p_since
  GROUP BY t.id;
END;
$function$;

-- Create performance indexes for events table
CREATE INDEX IF NOT EXISTS idx_events_tag_created_at 
ON events (tag_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_tag_type_created_at 
ON events (tag_id, event_type, created_at DESC);