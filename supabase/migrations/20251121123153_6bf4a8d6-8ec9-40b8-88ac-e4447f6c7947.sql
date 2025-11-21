-- Create function to get campaigns with events in a date range
CREATE OR REPLACE FUNCTION public.get_campaigns_with_events_in_daterange(
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone
)
RETURNS TABLE (campaign_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT c.id
  FROM campaigns c
  INNER JOIN tags t ON t.campaign_id = c.id
  INNER JOIN events e ON e.tag_id = t.id
  WHERE e.created_at >= p_start_date 
    AND e.created_at <= p_end_date
    AND (auth.uid() IS NOT NULL);
$$;