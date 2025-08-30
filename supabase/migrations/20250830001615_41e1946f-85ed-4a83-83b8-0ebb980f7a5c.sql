-- Fix the security definer view issue by removing the problematic view
-- First, let's check what views exist and recreate them without SECURITY DEFINER if needed

-- Drop the problematic view if it exists
DROP VIEW IF EXISTS public.campaign_metrics_daily CASCADE;

-- Recreate campaign_metrics_daily as a regular view (not SECURITY DEFINER)
CREATE VIEW public.campaign_metrics_daily AS
SELECT 
  c.id as campaign_id,
  DATE(e.created_at) as metric_date,
  COUNT(CASE WHEN e.event_type = 'page_view' THEN 1 END) as page_views,
  COUNT(CASE WHEN e.event_type = 'click' THEN 1 END) as cta_clicks,
  COUNT(CASE WHEN e.event_type = 'pin_click' THEN 1 END) as pin_clicks,
  COUNT(*) as total_events
FROM campaigns c
LEFT JOIN tags t ON t.campaign_id = c.id
LEFT JOIN events e ON e.tag_id = t.id
GROUP BY c.id, DATE(e.created_at);

-- Create a unique index on the materialized view to support CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_metrics_daily_unique 
ON public.campaign_metrics_daily (campaign_id, metric_date);