-- Fix get_campaigns_with_events_in_daterange to use campaign_metrics_daily instead of events table
-- This avoids RLS issues with SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION public.get_campaigns_with_events_in_daterange(
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone
)
RETURNS TABLE (campaign_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT campaign_id
  FROM campaign_metrics_daily
  WHERE metric_date >= p_start_date::date 
    AND metric_date <= p_end_date::date
    AND total_events > 0
    AND (auth.uid() IS NOT NULL);
$$;