import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCampaignGroupsQuery } from "./queries/useCampaignGroupsQuery";
import { useQueryClient } from "@tanstack/react-query";

export interface CampaignGroup {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'paused';
  start_date?: string;
  end_date?: string;
  insertion_order_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  insertion_order?: {
    id: string;
    client_name: string;
    description?: string;
  };
  campaigns_count?: number;
  total_clicks?: number;
  total_page_views?: number;
  derivedStatus: 'active' | 'paused';
}

export interface CreateCampaignGroupData {
  name: string;
  description?: string;
  insertion_order_id: string;
  start_date?: string;
  end_date?: string;
  status?: 'active' | 'paused';
}

export interface UpdateCampaignGroupData {
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status?: 'active' | 'paused';
  insertion_order_id?: string;
}

export const useCampaignGroups = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: campaignGroups = [], isLoading: loading, refetch } = useCampaignGroupsQuery();

  const fetchCampaignGroups = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const createCampaignGroup = useCallback(async (data: CreateCampaignGroupData) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const { data: newGroup, error } = await supabase
        .from('campaign_groups')
        .insert({
          ...data,
          user_id: user.id,
          status: data.status || 'active'
        })
        .select()
        .single();

      if (error) throw error;

      // Invalidate query to refresh
      queryClient.invalidateQueries({ queryKey: ['campaign-groups'] });
      
      return { data: newGroup, error: null };
    } catch (error) {
      console.error('Error creating campaign group:', error);
      return { error: 'Failed to create campaign group' };
    }
  }, [user, fetchCampaignGroups]);

  const updateCampaignGroup = useCallback(async (id: string, data: UpdateCampaignGroupData) => {
    try {
      const { data: updatedGroup, error } = await supabase
        .from('campaign_groups')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Invalidate query to refresh
      queryClient.invalidateQueries({ queryKey: ['campaign-groups'] });
      
      return { data: updatedGroup, error: null };
    } catch (error) {
      console.error('Error updating campaign group:', error);
      return { error: 'Failed to update campaign group' };
    }
  }, [queryClient]);

  const deleteCampaignGroup = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('campaign_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Invalidate query to refresh
      queryClient.invalidateQueries({ queryKey: ['campaign-groups'] });
      
      return { error: null };
    } catch (error) {
      console.error('Error deleting campaign group:', error);
      return { error: 'Failed to delete campaign group' };
    }
  }, [queryClient]);

  return {
    campaignGroups,
    loading,
    fetchCampaignGroups,
    createCampaignGroup,
    updateCampaignGroup,
    deleteCampaignGroup
  };
};