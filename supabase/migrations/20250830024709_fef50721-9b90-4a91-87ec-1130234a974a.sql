-- Clear all data from tables (fresh start)
-- Delete in correct order to avoid foreign key constraints

-- First delete events (no foreign key dependencies)
DELETE FROM events;

-- Then delete tags (references campaigns)
DELETE FROM tags;

-- Then delete campaigns (references campaign_groups)
DELETE FROM campaigns;

-- Then delete campaign_groups (references insertion_orders)
DELETE FROM campaign_groups;

-- Finally delete insertion_orders (base table)
DELETE FROM insertion_orders;