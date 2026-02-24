import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { InsertionOrderWithMetrics } from '@/hooks/useInsertionOrders';

export const useInsertionOrdersQuery = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['insertion-orders', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch insertion orders with profiles and campaign IDs only (NO events!)
      const { data: insertionOrdersData, error } = await supabase
        .from('insertion_orders')
        .select(`
          *,
          profiles!insertion_orders_user_id_fkey(email),
          campaigns(
            id,
            tags(id)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Collect all campaign IDs to fetch metrics from materialized view
      const allCampaignIds: string[] = [];
      (insertionOrdersData || []).forEach((io: any) => {
        (io.campaigns || []).forEach((c: any) => {
          allCampaignIds.push(c.id);
        });
      });

      // Fetch metrics from materialized view (fast!) instead of scanning 50M+ events
      let metricsMap = new Map<string, { cta_clicks: number; pin_clicks: number }>();
      if (allCampaignIds.length > 0) {
        const { data: metricsData } = await supabase
          .rpc('get_campaign_counters', { campaign_ids: allCampaignIds });

        if (Array.isArray(metricsData)) {
          metricsData.forEach((m: any) => {
            metricsMap.set(m.campaign_id, {
              cta_clicks: Number(m.cta_clicks) || 0,
              pin_clicks: Number(m.pin_clicks) || 0,
            });
          });
        }
      }

      // Process data to calculate metrics
      const processedData: InsertionOrderWithMetrics[] = (insertionOrdersData || []).map((io: any) => {
        const campaigns = io.campaigns || [];
        const campaigns_count = campaigns.length;
        
        let total_tags = 0;
        let total_clicks = 0;

        campaigns.forEach((campaign: any) => {
          const tags = campaign.tags || [];
          total_tags += tags.length;

          const metrics = metricsMap.get(campaign.id);
          if (metrics) {
            total_clicks += metrics.cta_clicks + metrics.pin_clicks;
          }
        });

        return {
          ...io,
          campaigns_count,
          total_tags,
          total_clicks,
          profile: Array.isArray(io.profiles) ? io.profiles[0] : io.profiles
        };
      });

      return processedData;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const prefetch = () => {
    if (user) {
      queryClient.prefetchQuery({
        queryKey: ['insertion-orders', user.id],
      });
    }
  };

  return { ...query, prefetch };
};
