-- Remove redundant indexes to save ~3.1 GB of disk space
-- These indexes are either redundant after trigger updates or covered by composite indexes

-- 1. idx_events_pv_dedup (1.6 GB) - Redundant after trigger update with advisory lock
DROP INDEX IF EXISTS idx_events_pv_dedup;

-- 2. idx_events_tag_type_created_at (1.1 GB) - Covered by idx_events_tag_created_type
DROP INDEX IF EXISTS idx_events_tag_type_created_at;

-- 3. idx_events_tag_type_created (288 MB) - Covered by idx_events_tag_created_type
DROP INDEX IF EXISTS idx_events_tag_type_created;

-- 4. idx_events_tag_created (288 MB) - Covered by idx_events_tag_created_type
DROP INDEX IF EXISTS idx_events_tag_created;

-- 5. idx_events_type (288 MB) - Rarely used in isolation, covered by composite indexes
DROP INDEX IF EXISTS idx_events_type;