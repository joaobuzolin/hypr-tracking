-- Add indexes for better performance on events table
CREATE INDEX IF NOT EXISTS idx_events_tag_id ON events(tag_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_tag_id_created_at ON events(tag_id, created_at);

-- Add index for campaigns and campaign groups
CREATE INDEX IF NOT EXISTS idx_campaigns_campaign_group_id ON campaigns(campaign_group_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_groups_insertion_order_id ON campaign_groups(insertion_order_id);
CREATE INDEX IF NOT EXISTS idx_tags_campaign_id ON tags(campaign_id);