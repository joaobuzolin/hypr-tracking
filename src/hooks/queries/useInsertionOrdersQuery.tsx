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

      // Fetch insertion orders with campaigns, tags and profiles in PARALLEL
      const { data: insertionOrdersData, error } = await supabase
        .from('insertion_orders')
        .select(`
          *,
          profiles!insertion_orders_user_id_fkey(email),
          campaigns(
            id,
            tags(
              id,
              events(event_type)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process data to calculate metrics
      const processedData: InsertionOrderWithMetrics[] = (insertionOrdersData || []).map((io: any) => {
        const campaigns = io.campaigns || [];
        const campaigns_count = campaigns.length;
        
        let total_tags = 0;
        let total_clicks = 0;

        campaigns.forEach((campaign: any) => {
          const tags = campaign.tags || [];
          total_tags += tags.length;

          tags.forEach((tag: any) => {
            const events = tag.events || [];
            total_clicks += events.filter((e: any) => 
              e.event_type === 'click' || e.event_type === 'pin_click'
            ).length;
          });
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
    staleTime: 5 * 60 * 1000, // 5 minutes (changes less frequently)
    gcTime: 10 * 60 * 1000, // 10 minutes
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
