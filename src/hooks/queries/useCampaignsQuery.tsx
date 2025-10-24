import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { CampaignWithTags, Tag, Profile } from '@/hooks/useCampaigns';

export const useCampaignsQuery = (campaignGroupId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['campaigns', user?.id, campaignGroupId],
    queryFn: async () => {
      if (!user) return [];

      // Build query with optional campaign_group_id filter
      let query = supabase
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

      if (campaignGroupId) {
        query = query.eq('campaign_group_id', campaignGroupId);
      }

      const { data: campaignsData, error: campaignsError } = await query;

      if (campaignsError) throw campaignsError;

      // Collect all campaign IDs and user IDs for batch fetching
      const campaignIds = (campaignsData || []).map(c => c.id);
      const userIds = [...new Set((campaignsData || []).map(c => c.user_id).filter(Boolean))];

      // Fetch profiles and metrics in PARALLEL
      const [profilesData, metricsData] = await Promise.all([
        userIds.length > 0
          ? supabase.from('profiles').select('*').in('id', userIds)
          : Promise.resolve({ data: [], error: null }),
        campaignIds.length > 0
          ? supabase.rpc('get_campaign_counters', { campaign_ids: campaignIds })
          : Promise.resolve({ data: [], error: null })
      ]);

      // Create lookup maps
      const profilesMap = new Map(
        (profilesData.data || []).map(p => [p.id, p])
      );

      const metricsMap = new Map(
        (metricsData.data || []).map((m: any) => [
          m.campaign_id,
          {
            cta_clicks: Number(m.cta_clicks) || 0,
            pin_clicks: Number(m.pin_clicks) || 0,
            page_views: Number(m.page_views) || 0,
            total_7d: Number(m.total_7d) || 0,
            last_hour: Number(m.last_hour) || 0
          }
        ])
      );

      // Combine data
      const campaignsWithMetrics: CampaignWithTags[] = (campaignsData || []).map((campaign) => {
        const metrics = metricsMap.get(campaign.id) || {
          cta_clicks: 0,
          pin_clicks: 0,
          page_views: 0,
          total_7d: 0,
          last_hour: 0
        };

        const hasRecentActivity = metrics.last_hour > 0;

        return {
          ...campaign,
          tags: campaign.tags || [],
          profile: campaign.user_id ? profilesMap.get(campaign.user_id) : undefined,
          campaign_group: (campaign as any).campaign_groups,
          insertion_order: (campaign as any).insertion_orders,
          metrics,
          derivedStatus: hasRecentActivity ? 'active' : 'paused'
        } as CampaignWithTags;
      });

      return campaignsWithMetrics;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const prefetch = (groupId?: string) => {
    if (user) {
      queryClient.prefetchQuery({
        queryKey: ['campaigns', user.id, groupId],
      });
    }
  };

  return { ...query, prefetch };
};
