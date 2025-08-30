-- Fix security definer view issue by checking if events_with_tags is a view and converting to security invoker
-- First, check what views exist and fix them

-- Drop and recreate the events_with_tags view as SECURITY INVOKER instead of SECURITY DEFINER
DROP VIEW IF EXISTS events_with_tags;

CREATE OR REPLACE VIEW events_with_tags
WITH (security_invoker = true)
AS
SELECT 
    e.id,
    e.created_at,
    e.tag_id,
    e.event_type,
    t.campaign_id,
    t.title as tag_title,
    t.type as tag_type,
    '' as event_label  -- placeholder for compatibility
FROM events e
LEFT JOIN tags t ON e.tag_id = t.id;

-- Remove API access to any materialized views if they exist
-- Check if campaign_metrics_daily is a materialized view and restrict access
DO $$
BEGIN
    -- Revoke access from anon and authenticated users to materialized views
    IF EXISTS (
        SELECT 1 
        FROM pg_matviews 
        WHERE matviewname = 'campaign_metrics_daily'
    ) THEN
        REVOKE ALL ON campaign_metrics_daily FROM anon;
        REVOKE ALL ON campaign_metrics_daily FROM authenticated;
        REVOKE ALL ON campaign_metrics_daily FROM public;
        
        -- Only allow service_role to access materialized views
        GRANT SELECT ON campaign_metrics_daily TO service_role;
    END IF;
END $$;