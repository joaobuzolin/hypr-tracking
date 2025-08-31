CREATE OR REPLACE FUNCTION public.get_report_aggregated(p_campaign_ids uuid[] DEFAULT NULL::uuid[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_group_by text DEFAULT 'day'::text, p_breakdown_by_tags boolean DEFAULT false)
 RETURNS TABLE(period_start timestamp with time zone, campaign_id uuid, tag_id uuid, tag_title text, page_views bigint, cta_clicks bigint, pin_clicks bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  date_trunc_format text;
  start_date_filter date;
  end_date_filter date;
BEGIN
  -- Set date filters
  start_date_filter := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
  end_date_filter := COALESCE(p_end_date, CURRENT_DATE);
  
  -- Set date truncation format
  CASE p_group_by
    WHEN 'week' THEN date_trunc_format := 'week';
    WHEN 'month' THEN date_trunc_format := 'month';
    ELSE date_trunc_format := 'day';
  END CASE;

  IF p_breakdown_by_tags THEN
    -- Return data broken down by tags
    RETURN QUERY
    EXECUTE format('
      SELECT 
        date_trunc(%L, e.created_at) as period_start,
        t.campaign_id,
        t.id as tag_id,
        t.title as tag_title,
        COALESCE(SUM(CASE WHEN e.event_type = ''page_view'' THEN 1 ELSE 0 END), 0) as page_views,
        COALESCE(SUM(CASE WHEN e.event_type = ''click'' THEN 1 ELSE 0 END), 0) as cta_clicks,
        COALESCE(SUM(CASE WHEN e.event_type = ''pin_click'' THEN 1 ELSE 0 END), 0) as pin_clicks
      FROM tags t
      LEFT JOIN events e ON t.id = e.tag_id 
        AND e.created_at >= $1 
        AND e.created_at <= $2 + INTERVAL ''1 day'' - INTERVAL ''1 second''
      WHERE (auth.uid() IS NOT NULL)
        AND ($3 IS NULL OR t.campaign_id = ANY($3))
      GROUP BY date_trunc(%L, e.created_at), t.campaign_id, t.id, t.title
      HAVING COALESCE(SUM(CASE WHEN e.event_type IN (''page_view'',''click'',''pin_click'') THEN 1 ELSE 0 END), 0) > 0
      ORDER BY period_start DESC, t.campaign_id, t.title',
      date_trunc_format, date_trunc_format
    ) USING start_date_filter, end_date_filter, p_campaign_ids;
  ELSE
    -- Return data aggregated by period only
    RETURN QUERY
    EXECUTE format('
      SELECT 
        date_trunc(%L, e.created_at) as period_start,
        t.campaign_id,
        NULL::uuid as tag_id,
        NULL::text as tag_title,
        COALESCE(SUM(CASE WHEN e.event_type = ''page_view'' THEN 1 ELSE 0 END), 0) as page_views,
        COALESCE(SUM(CASE WHEN e.event_type = ''click'' THEN 1 ELSE 0 END), 0) as cta_clicks,
        COALESCE(SUM(CASE WHEN e.event_type = ''pin_click'' THEN 1 ELSE 0 END), 0) as pin_clicks
      FROM tags t
      LEFT JOIN events e ON t.id = e.tag_id 
        AND e.created_at >= $1 
        AND e.created_at <= $2 + INTERVAL ''1 day'' - INTERVAL ''1 second''
      WHERE (auth.uid() IS NOT NULL)
        AND ($3 IS NULL OR t.campaign_id = ANY($3))
      GROUP BY date_trunc(%L, e.created_at), t.campaign_id
      HAVING COALESCE(SUM(CASE WHEN e.event_type IN (''page_view'',''click'',''pin_click'') THEN 1 ELSE 0 END), 0) > 0
      ORDER BY period_start DESC, t.campaign_id',
      date_trunc_format, date_trunc_format
    ) USING start_date_filter, end_date_filter, p_campaign_ids;
  END IF;
END;
$function$