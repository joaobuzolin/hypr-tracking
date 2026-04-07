import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useCampaignsQuery } from './queries/useCampaignsQuery';
import { useQueryClient } from '@tanstack/react-query';

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


export const useCampaigns = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: campaigns = [], isLoading: loading, isFetching, refetch } = useCampaignsQuery();


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

      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-groups'] });

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

      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });

      return { data, error: null };
    } catch (error) {
      console.error('Error creating tag:', error);
      return { data: null, error };
    }
  }, [user, campaigns, queryClient]);

  const deleteTag = useCallback(async (tagId: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;

      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      return { error: null };
    } catch (error) {
      console.error('Error deleting tag:', error);
      return { error };
    }
  }, [user, queryClient]);

  return {
    campaigns,
    loading,
    isFetching,
    createCampaign,
    createTag,
    deleteTag
  };
};
