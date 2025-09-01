import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Campaign {
  id: string;
  user_id: string;
  insertion_order_id?: string;
  campaign_group_id: string;
  name: string;
  description: string;
  creative_format?: string;
  short_token?: string;
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

export interface Profile {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignWithTags extends Campaign {
  tags: Tag[];
  profile?: Profile;
  campaign_group?: {
    name: string;
  };
  insertion_order?: {
    client_name: string;
  };
  metrics: {
    cta_clicks: number;
    pin_clicks: number;
    page_views: number;
    total_7d: number;
    last_hour: number;
  };
  derivedStatus: 'active' | 'paused';
}

// Função utilitária para classificar eventos baseado no tipo da tag
const classifyEventByTagType = (event: any, tagType: string) => {
  // Se o event_type já está correto, use ele
  if (event.event_type === 'page_view' || event.event_type === 'pin_click' || event.event_type === 'click') {
    return event.event_type;
  }
  
  // Para eventos antigos ou inconsistentes, classifique baseado no tipo da tag
  if (event.event_type === 'view') {
    switch (tagType) {
      case 'page-view':
        return 'page_view';
      case 'pin':
        return 'pin_click';
      case 'click-button':
        return 'click';
      default:
        return event.event_type;
    }
  }
  
  // Fallback para outros casos
  return event.event_type;
};

export const useCampaigns = () => {
  const [campaigns, setCampaigns] = useState<CampaignWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Memoizar consultas para evitar re-renders desnecessários
  const memoizedCampaigns = useMemo(() => campaigns, [campaigns]);

  const fetchCampaigns = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch all campaigns (with or without tags)
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select(`
          *,
          tags (
            id,
            title,
            code,
            type,
            created_at,
            campaign_id
          ),
          campaign_groups!campaigns_campaign_group_id_fkey (
            name
          ),
          insertion_orders (
            client_name
          )
        `)
        .order('created_at', { ascending: false });
        // NO LIMITS - fetch all campaigns

      if (campaignsError) throw campaignsError;

      // For each campaign, fetch the profile and metrics
      const campaignsWithMetrics = await Promise.all(
        (campaignsData || []).map(async (campaign) => {
          const tagIds = campaign.tags?.map((tag: Tag) => tag.id) || [];
          
          // Fetch profile separately if user_id exists
          let profile: Profile | undefined = undefined;
          if (campaign.user_id) {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', campaign.user_id)
              .maybeSingle();
            
            if (!profileError && profileData) {
              profile = profileData;
            }
          }
          
          let metrics = {
            cta_clicks: 0,
            pin_clicks: 0,
            page_views: 0,
            total_7d: 0,
            last_hour: 0
          };

          // Use the new RPC for precise metrics - NO LIMITS!
          if (tagIds.length > 0) {
            const { data: counters, error: countersError } = await supabase
              .rpc('get_campaign_counters', {
                campaign_ids: [campaign.id]
              });

            if (!countersError && counters && counters.length > 0) {
              const counter = counters[0];
              metrics = {
                cta_clicks: Number(counter.cta_clicks) || 0,
                pin_clicks: Number(counter.pin_clicks) || 0,
                page_views: Number(counter.page_views) || 0,
                total_7d: Number(counter.total_7d) || 0,
                last_hour: Number(counter.last_hour) || 0
              };
              
              console.log(`Campaign ${campaign.name} metrics (unlimited):`, metrics);
            }
          }

          // Calculate derived status based on last hour activity (we already have this from metrics)
          const hasRecentActivity = metrics.last_hour > 0;

          return {
            ...campaign,
            tags: campaign.tags || [],
            profile,
            campaign_group: (campaign as any).campaign_groups,
            insertion_order: (campaign as any).insertion_orders,
            metrics,
            derivedStatus: hasRecentActivity ? 'active' : 'paused'
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
  }, [user, toast]);

  const createCampaign = useCallback(async (campaignData: {
    name: string;
    description: string;
    short_token?: string;
    insertion_order_id?: string;
    campaign_group_id?: string;
    creative_format?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    if (!user) return { error: 'Usuário não autenticado' };

    // Validate required campaign_group_id
    if (!campaignData.campaign_group_id) {
      return { error: 'Grupo de campanha é obrigatório para criar um criativo' };
    }

    try {
      const startDate = campaignData.start_date || new Date().toISOString().split('T')[0];
      const endDate = campaignData.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('campaigns')
        .insert([
          {
            user_id: user.id,
            insertion_order_id: campaignData.insertion_order_id,
            campaign_group_id: campaignData.campaign_group_id,
            name: campaignData.name,
            description: campaignData.description,
            short_token: campaignData.short_token,
            creative_format: campaignData.creative_format,
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
          total_7d: 0,
          last_hour: 0
        },
        derivedStatus: 'paused' // New campaigns start as paused until they have activity
      };
      
      setCampaigns(prev => [newCampaignWithMetrics, ...prev]);

      return { data, error: null };
    } catch (error) {
      console.error('Error creating campaign:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao criar campanha';
      return { data: null, error: errorMessage };
    }
  }, [user, campaigns]);

  const createTag = useCallback(async (tagData: {
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
  }, [user, campaigns, fetchCampaigns]);

  useEffect(() => {
    if (user) {
      fetchCampaigns();
    }
  }, [user]);

  const deleteTag = useCallback(async (tagId: string) => {
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
  }, [user, fetchCampaigns]);

  return {
    campaigns: memoizedCampaigns,
    loading,
    fetchCampaigns,
    createCampaign,
    createTag,
    deleteTag
  };
};
