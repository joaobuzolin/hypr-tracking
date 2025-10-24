import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { CampaignWithTags } from '@/hooks/useCampaigns';

export const useSingleCampaignQuery = (campaignId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      if (!user || !campaignId) return null;

      // Try to get from campaigns cache first (optimistic)
      const cachedCampaigns = queryClient.getQueryData<CampaignWithTags[]>(['campaigns', user.id]);
      const cachedCampaign = cachedCampaigns?.find(c => c.id === campaignId);
      
      // Fetch single campaign with all details
      const { data: campaignData, error: campaignError } = await supabase
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
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;

      // Fetch profile and metrics in PARALLEL
      const [profileData, metricsData] = await Promise.all([
        campaignData.user_id
          ? supabase.from('profiles').select('*').eq('id', campaignData.user_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase.rpc('get_campaign_counters', { campaign_ids: [campaignId] })
      ]);

      const metrics = metricsData.data?.[0] || {
        cta_clicks: 0,
        pin_clicks: 0,
        page_views: 0,
        total_7d: 0,
        last_hour: 0
      };

      const processedMetrics = {
        cta_clicks: Number(metrics.cta_clicks) || 0,
        pin_clicks: Number(metrics.pin_clicks) || 0,
        page_views: Number(metrics.page_views) || 0,
        total_7d: Number(metrics.total_7d) || 0,
        last_hour: Number(metrics.last_hour) || 0
      };

      const hasRecentActivity = processedMetrics.last_hour > 0;

      const campaign: CampaignWithTags = {
        ...campaignData,
        status: campaignData.status as 'active' | 'paused' | 'completed',
        tags: (campaignData.tags || []) as any,
        profile: profileData.data || undefined,
        campaign_group: (campaignData as any).campaign_groups,
        insertion_order: (campaignData as any).insertion_orders,
        metrics: processedMetrics,
        derivedStatus: hasRecentActivity ? 'active' : 'paused'
      } as CampaignWithTags;

      return campaign;
    },
    enabled: !!user && !!campaignId,
    staleTime: 1 * 60 * 1000, // 1 minute (details page should be fresher)
    gcTime: 5 * 60 * 1000,
    // Use cached data while fetching fresh data
    initialData: () => {
      const cachedCampaigns = queryClient.getQueryData<CampaignWithTags[]>(['campaigns', user?.id]);
      return cachedCampaigns?.find(c => c.id === campaignId);
    },
    initialDataUpdatedAt: () => {
      return queryClient.getQueryState(['campaigns', user?.id])?.dataUpdatedAt;
    }
  });

  const prefetch = (id: string) => {
    if (user && id) {
      queryClient.prefetchQuery({
        queryKey: ['campaign', id],
      });
    }
  };

  return { ...query, prefetch };
};
