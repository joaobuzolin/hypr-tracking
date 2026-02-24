import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { CampaignGroup } from '@/hooks/useCampaignGroups';

export const useCampaignGroupsQuery = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['campaign-groups', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch campaign groups with insertion order info and campaigns with their tags
      const { data: groups, error } = await supabase
        .from('campaign_groups')
        .select(`
          *,
          insertion_orders!inner(id, client_name, description),
          campaigns!campaigns_campaign_group_id_fkey(
            id,
            tags(id)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Collect all campaign IDs for batch metrics fetch
      const allCampaignIds = (groups || []).flatMap(group => 
        (group.campaigns || []).map((campaign: any) => campaign.id)
      );

      // Fetch metrics for all campaigns in one call (PARALLEL)
      let campaignMetrics: Record<string, { page_views: number; cta_clicks: number; pin_clicks: number; last_hour: number }> = {};
      
      if (allCampaignIds.length > 0) {
        const { data: metricsData, error: metricsError } = await supabase
          .rpc('get_campaign_counters', { campaign_ids: allCampaignIds });

        if (!metricsError && metricsData) {
          campaignMetrics = metricsData.reduce((acc: any, item: any) => {
            acc[item.campaign_id] = {
              page_views: item.page_views || 0,
              cta_clicks: item.cta_clicks || 0,
              pin_clicks: item.pin_clicks || 0,
              last_hour: item.last_hour || 0
            };
            return acc;
          }, {});
        }
      }

      // Process the data to include aggregated metrics and derived status
      const processedGroups: CampaignGroup[] = (groups || []).map((group) => {
        const campaigns = group.campaigns || [];
        const campaignsCount = campaigns.length;
        
        let totalPageViews = 0;
        let totalClicks = 0;
        let hasRecentActivity = false;

        campaigns.forEach((campaign: any) => {
          const metrics = campaignMetrics[campaign.id];
          if (metrics) {
            totalPageViews += metrics.page_views;
            totalClicks += metrics.cta_clicks + metrics.pin_clicks;
            if (metrics.last_hour > 0) {
              hasRecentActivity = true;
            }
          }
        });

        const derivedStatus = group.status === 'paused' ? 'paused' : (hasRecentActivity ? 'active' : 'paused');

        return {
          ...group,
          status: group.status as 'active' | 'paused',
          insertion_order: group.insertion_orders,
          campaigns_count: campaignsCount,
          total_clicks: totalClicks,
          total_page_views: totalPageViews,
          derivedStatus
        } as CampaignGroup;
      });

      return processedGroups;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const prefetch = () => {
    if (user) {
      queryClient.prefetchQuery({
        queryKey: ['campaign-groups', user.id],
      });
    }
  };

  return { ...query, prefetch };
};
