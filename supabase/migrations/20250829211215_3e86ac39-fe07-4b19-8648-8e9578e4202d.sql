-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('active', 'paused', 'completed')) DEFAULT 'active',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tags table
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('click-button', 'pin', 'page-view')) NOT NULL,
  title TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  user_agent TEXT,
  ip_address INET,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create policies for campaigns
CREATE POLICY "Users can view their own campaigns" 
ON public.campaigns 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own campaigns" 
ON public.campaigns 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns" 
ON public.campaigns 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns" 
ON public.campaigns 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for tags
CREATE POLICY "Users can view tags from their campaigns" 
ON public.tags 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = tags.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create tags for their campaigns" 
ON public.tags 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = tags.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update tags from their campaigns" 
ON public.tags 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = tags.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete tags from their campaigns" 
ON public.tags 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = tags.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

-- Create policies for events (more open for tracking)
CREATE POLICY "Users can view events from their campaign tags" 
ON public.events 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.tags 
    JOIN public.campaigns ON campaigns.id = tags.campaign_id
    WHERE tags.id = events.tag_id 
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can insert events" 
ON public.events 
FOR INSERT 
WITH CHECK (true);

-- Create update function for timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for campaigns
CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX idx_tags_campaign_id ON public.tags(campaign_id);
CREATE INDEX idx_tags_code ON public.tags(code);
CREATE INDEX idx_events_tag_id ON public.events(tag_id);
CREATE INDEX idx_events_created_at ON public.events(created_at);
CREATE INDEX idx_events_event_type ON public.events(event_type);