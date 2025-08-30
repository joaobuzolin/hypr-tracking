-- Create campaign_groups table for the new Campaign level
CREATE TABLE public.campaign_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  insertion_order_id UUID NOT NULL,
  user_id UUID,
  status TEXT DEFAULT 'active'::text,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on campaign_groups
ALTER TABLE public.campaign_groups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for campaign_groups
CREATE POLICY "Authenticated users can create campaign groups" 
ON public.campaign_groups 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view all campaign groups" 
ON public.campaign_groups 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can update all campaign groups" 
ON public.campaign_groups 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete all campaign groups" 
ON public.campaign_groups 
FOR DELETE 
USING (true);

-- Add new fields to campaigns table (which will become creatives)
ALTER TABLE public.campaigns 
ADD COLUMN campaign_group_id UUID,
ADD COLUMN creative_format TEXT DEFAULT 'banner'::text;

-- Create trigger for campaign_groups updated_at
CREATE TRIGGER update_campaign_groups_updated_at
BEFORE UPDATE ON public.campaign_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();