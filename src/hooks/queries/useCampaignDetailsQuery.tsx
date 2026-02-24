import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { CampaignWithTags } from '@/hooks/useCampaigns';

export const useCampaignDetailsQuery = (campaignId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['campaign-details', campaignId],
    queryFn: async () => {
      if (!user || !campaignId) return null;

      // Fetch ONLY this campaign (not all campaigns)
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
        .maybeSingle();

      if (campaignError) throw campaignError;
      if (!campaignData) return null;

      // Fetch profile and metrics in PARALLEL
      const [profileData, metricsData] = await Promise.all([
        campaignData.user_id
          ? supabase.from('profiles').select('*').eq('id', campaignData.user_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase.rpc('get_campaign_counters', { campaign_ids: [campaignId] })
      ]);

      // Get metrics from materialized view (much faster than scanning events table)
      const metrics = Array.isArray(metricsData.data) && metricsData.data.length > 0
        ? {
            cta_clicks: Number(metricsData.data[0].cta_clicks) || 0,
            pin_clicks: Number(metricsData.data[0].pin_clicks) || 0,
            page_views: Number(metricsData.data[0].page_views) || 0,
            total_7d: Number(metricsData.data[0].total_7d) || 0,
            last_hour: Number(metricsData.data[0].last_hour) || 0
          }
        : {
            cta_clicks: 0,
            pin_clicks: 0,
            page_views: 0,
            total_7d: 0,
            last_hour: 0
          };

      const hasRecentActivity = metrics.last_hour > 0;

      const campaignWithMetrics: CampaignWithTags = {
        ...campaignData,
        status: (campaignData.status as 'active' | 'paused' | 'completed') || 'active',
        tags: (campaignData.tags || []) as any,
        profile: profileData.data || undefined,
        campaign_group: (campaignData as any).campaign_groups,
        insertion_order: (campaignData as any).insertion_orders,
        metrics,
        derivedStatus: hasRecentActivity ? 'active' : 'paused'
      };

      return campaignWithMetrics;
    },
    enabled: !!user && !!campaignId,
    staleTime: 2 * 60 * 1000, // 2 minutes - fresher data for details page
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const prefetch = (id: string) => {
    if (user && id) {
      queryClient.prefetchQuery({
        queryKey: ['campaign-details', id],
      });
    }
  };

  return { ...query, prefetch };
};
