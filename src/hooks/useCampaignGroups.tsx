import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

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
}

export const useCampaignGroups = () => {
  const [campaignGroups, setCampaignGroups] = useState<CampaignGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchCampaignGroups = useCallback(async () => {
    if (!user) {
      setCampaignGroups([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch campaign groups with insertion order info and campaign metrics
      const { data: groups, error } = await supabase
        .from('campaign_groups')
        .select(`
          *,
          insertion_orders!inner(id, client_name, description),
          campaigns(
            id,
            metrics:events_with_tags(
              event_type
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

        // Process the data to include aggregated metrics
        const processedGroups: CampaignGroup[] = (groups || []).map(group => {
          const campaigns = group.campaigns || [];
          const campaignsCount = campaigns.length;
          
          // Calculate total metrics from all campaigns in this group
          let totalClicks = 0;
          let totalPageViews = 0;
          
          campaigns.forEach((campaign: any) => {
            if (campaign.metrics) {
              campaign.metrics.forEach((event: any) => {
                if (event.event_type === 'click' || event.event_type === 'pin_click') {
                  totalClicks++;
                } else if (event.event_type === 'page_view') {
                  totalPageViews++;
                }
              });
            }
          });

          return {
            ...group,
            status: group.status as 'active' | 'paused',
            insertion_order: group.insertion_orders,
            campaigns_count: campaignsCount,
            total_clicks: totalClicks,
            total_page_views: totalPageViews
          };
        });

        setCampaignGroups(processedGroups);
    } catch (error) {
      console.error('Error fetching campaign groups:', error);
      setCampaignGroups([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

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

      // Refresh the list
      await fetchCampaignGroups();
      
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

      // Refresh the list
      await fetchCampaignGroups();
      
      return { data: updatedGroup, error: null };
    } catch (error) {
      console.error('Error updating campaign group:', error);
      return { error: 'Failed to update campaign group' };
    }
  }, [fetchCampaignGroups]);

  const deleteCampaignGroup = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('campaign_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Refresh the list
      await fetchCampaignGroups();
      
      return { error: null };
    } catch (error) {
      console.error('Error deleting campaign group:', error);
      return { error: 'Failed to delete campaign group' };
    }
  }, [fetchCampaignGroups]);

  useEffect(() => {
    fetchCampaignGroups();
  }, [fetchCampaignGroups]);

  return {
    campaignGroups,
    loading,
    fetchCampaignGroups,
    createCampaignGroup,
    updateCampaignGroup,
    deleteCampaignGroup
  };
};