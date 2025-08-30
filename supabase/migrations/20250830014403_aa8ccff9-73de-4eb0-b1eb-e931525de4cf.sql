-- Ensure proper foreign key relationships
ALTER TABLE public.campaigns 
DROP CONSTRAINT IF EXISTS campaigns_campaign_group_id_fkey;

ALTER TABLE public.campaigns 
ADD CONSTRAINT campaigns_campaign_group_id_fkey 
FOREIGN KEY (campaign_group_id) REFERENCES public.campaign_groups(id) ON DELETE CASCADE;

-- Create default campaign groups for existing campaigns that don't have one
DO $$
DECLARE
    campaign_record RECORD;
    default_group_id UUID;
BEGIN
    -- For each campaign without a campaign_group_id, create a default campaign group
    FOR campaign_record IN 
        SELECT DISTINCT c.insertion_order_id, c.user_id, io.client_name
        FROM campaigns c
        LEFT JOIN insertion_orders io ON c.insertion_order_id = io.id
        WHERE c.campaign_group_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM campaign_groups cg WHERE cg.id = c.campaign_group_id
        )
    LOOP
        -- Create a default campaign group for this insertion order
        INSERT INTO campaign_groups (
            insertion_order_id, 
            user_id, 
            name, 
            description,
            status
        ) VALUES (
            campaign_record.insertion_order_id,
            campaign_record.user_id,
            COALESCE(campaign_record.client_name, 'Cliente') || ' - Campanha Padrão',
            'Campanha criada automaticamente para organizar criativos existentes',
            'active'
        )
        RETURNING id INTO default_group_id;
        
        -- Update campaigns to use this default campaign group
        UPDATE campaigns 
        SET campaign_group_id = default_group_id
        WHERE insertion_order_id = campaign_record.insertion_order_id 
        AND (campaign_group_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM campaign_groups cg WHERE cg.id = campaign_group_id
        ));
    END LOOP;
END $$;

-- Make campaign_group_id required after migration
ALTER TABLE public.campaigns 
ALTER COLUMN campaign_group_id SET NOT NULL;