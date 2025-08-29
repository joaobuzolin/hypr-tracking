import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed';
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  campaign_id: string;
  type: 'click-button' | 'pin' | 'page-view';
  title: string;
  code: string;
  created_at: string;
}

export interface CampaignWithTags extends Campaign {
  tags: Tag[];
  metrics: {
    cta_clicks: number;
    pin_clicks: number;
    page_views: number;
    total_7d: number;
  };
}

export const useCampaigns = () => {
  const [campaigns, setCampaigns] = useState<CampaignWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchCampaigns = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch campaigns with tags
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select(`
          *,
          tags (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;

      // For each campaign, fetch metrics from events
      const campaignsWithMetrics = await Promise.all(
        (campaignsData || []).map(async (campaign) => {
          const tagIds = campaign.tags?.map((tag: Tag) => tag.id) || [];
          
          let metrics = {
            cta_clicks: 0,
            pin_clicks: 0,
            page_views: 0,
            total_7d: 0
          };

          if (tagIds.length > 0) {
            // Get events for this campaign's tags
            const { data: eventsData, error: eventsError } = await supabase
              .from('events')
              .select('event_type, created_at')
              .in('tag_id', tagIds);

            if (!eventsError && eventsData) {
              const now = new Date();
              const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

              eventsData.forEach((event) => {
                const eventDate = new Date(event.created_at);
                
                // Count total events in last 7 days
                if (eventDate >= sevenDaysAgo) {
                  metrics.total_7d++;
                }

                // Count by event type
                switch (event.event_type) {
                  case 'click':
                  case 'click_button':
                  case 'cta_click':
                    metrics.cta_clicks++;
                    break;
                  case 'pin_click':
                  case 'view':
                  case 'map_pin':
                    metrics.pin_clicks++;
                    break;
                  case 'page_view':
                    metrics.page_views++;
                    break;
                }
              });
            }
          }

          return {
            ...campaign,
            tags: campaign.tags || [],
            metrics
          } as CampaignWithTags;
        })
      );

      setCampaigns(campaignsWithMetrics);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as campanhas.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async (campaignData: {
    name: string;
    description: string;
    start_date?: string;
    end_date?: string;
  }) => {
    if (!user) return { error: 'Usuário não autenticado' };

    try {
      const startDate = campaignData.start_date || new Date().toISOString().split('T')[0];
      const endDate = campaignData.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('campaigns')
        .insert([
          {
            user_id: user.id,
            name: campaignData.name,
            description: campaignData.description,
            start_date: startDate,
            end_date: endDate,
            status: 'active'
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Add to campaigns list immediately for better UX
      const newCampaignWithMetrics: CampaignWithTags = {
        ...data,
        user_id: data.user_id || '',
        description: data.description || '',
        status: (data.status || 'active') as 'active' | 'paused' | 'completed',
        tags: [],
        metrics: {
          cta_clicks: 0,
          pin_clicks: 0,
          page_views: 0,
          total_7d: 0
        }
      };
      
      setCampaigns(prev => [newCampaignWithMetrics, ...prev]);

      return { data, error: null };
    } catch (error) {
      console.error('Error creating campaign:', error);
      return { data: null, error };
    }
  };

  const createTag = async (tagData: {
    campaign_id: string;
    type: 'click-button' | 'pin' | 'page-view';
    title: string;
  }) => {
    if (!user) return { error: 'Usuário não autenticado' };

    try {
      // Generate unique tag code
      const campaignName = campaigns.find(c => c.id === tagData.campaign_id)?.name || 'campaign';
      const cleanCampaign = campaignName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
      const cleanTitle = tagData.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
      const random = Math.random().toString(36).slice(2, 7);
      const code = `${cleanCampaign}-${cleanTitle}-${tagData.type}-${random}`;

      const { data, error } = await supabase
        .from('tags')
        .insert([
          {
            campaign_id: tagData.campaign_id,
            type: tagData.type,
            title: tagData.title,
            code: code
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Update campaigns list immediately for better UX
      await fetchCampaigns();

      return { data, error: null };
    } catch (error) {
      console.error('Error creating tag:', error);
      return { data: null, error };
    }
  };

  useEffect(() => {
    if (user) {
      fetchCampaigns();
    }
  }, [user]);

  const deleteTag = async (tagId: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;

      // Atualizar a lista de campanhas após deletar a tag
      await fetchCampaigns();
      return { error: null };
    } catch (error) {
      console.error('Error deleting tag:', error);
      return { error };
    }
  };

  return {
    campaigns,
    loading,
    fetchCampaigns,
    createCampaign,
    createTag,
    deleteTag
  };
};