-- Create partial index for page view deduplication
CREATE INDEX IF NOT EXISTS idx_events_pv_dedup 
ON events (tag_id, ip_address, user_agent, created_at) 
WHERE event_type = 'page_view';

-- Create function to prevent page view duplicates
CREATE OR REPLACE FUNCTION prevent_duplicate_page_views()
RETURNS TRIGGER AS $$
DECLARE
  duplicate_count INTEGER;
  unique_id TEXT;
BEGIN
  -- Only apply deduplication to page_view events
  IF NEW.event_type != 'page_view' THEN
    RETURN NEW;
  END IF;

  -- Extract unique_id from metadata if available (from cb3 parameter)
  unique_id := NEW.metadata->>'unique_id';
  IF unique_id IS NULL OR unique_id = '' THEN
    unique_id := NEW.metadata->'query_params'->>'cb3';
  END IF;

  -- Check for duplicates within 5 seconds window
  IF unique_id IS NOT NULL AND unique_id != '' THEN
    -- Use unique_id for precise deduplication (DV360/Xandr/TTD)
    SELECT COUNT(*) INTO duplicate_count
    FROM events 
    WHERE tag_id = NEW.tag_id 
      AND event_type = 'page_view'
      AND created_at >= NOW() - INTERVAL '5 seconds'
      AND (
        metadata->>'unique_id' = unique_id 
        OR metadata->'query_params'->>'cb3' = unique_id
      );
  ELSE
    -- Fallback: use ip + user_agent for deduplication
    SELECT COUNT(*) INTO duplicate_count
    FROM events 
    WHERE tag_id = NEW.tag_id 
      AND event_type = 'page_view'
      AND ip_address = NEW.ip_address
      AND user_agent = NEW.user_agent
      AND created_at >= NOW() - INTERVAL '5 seconds';
  END IF;

  -- If duplicate found, prevent insertion
  IF duplicate_count > 0 THEN
    RAISE NOTICE 'Preventing duplicate page_view: tag_id=%, unique_id=%, ip=%', 
      NEW.tag_id, COALESCE(unique_id, 'fallback'), NEW.ip_address;
    RETURN NULL; -- Cancel insertion
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to execute before insert
DROP TRIGGER IF EXISTS prevent_duplicate_page_views_trigger ON events;
CREATE TRIGGER prevent_duplicate_page_views_trigger
  BEFORE INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_page_views();