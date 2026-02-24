
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';

export interface ReportEvent {
  period: string;
  campaignId: string;
  campaignName: string;
  campaignGroupName: string;
  creativeName: string;
  campaignStatus: string;
  campaignDescription: string;
  campaignTags: string;
  insertionOrderName: string;
  creativeFormat: string;
  shortToken: string;
  tagId?: string;
  tagTitle?: string;
  pageViews: number;
  ctaClicks: number;
  pinClicks: number;
  totalClicks: number;
  ctr: number;
}

interface UseReportEventsProps {
  selectedCampaignIds: string[];
  dateRange: { from: Date; to: Date } | undefined;
  groupBy: 'day' | 'week' | 'month';
  selectedDimensions: string[];
}

// Helper: format period string
function formatPeriod(periodStart: string, groupBy: string): string {
  const periodDate = new Date(periodStart);
  const year = periodDate.getUTCFullYear();
  const month = periodDate.getUTCMonth();
  const day = periodDate.getUTCDate();
  const localDate = new Date(year, month, day);

  switch (groupBy) {
    case 'week':
      return `Semana ${format(localDate, 'dd/MM/yyyy')}`;
    case 'month':
      return format(localDate, 'MM/yyyy');
    default:
      return format(localDate, 'dd/MM/yyyy');
  }
}

// Helper: transform raw DB rows into ReportEvent[]
function transformRows(
  aggregatedData: any[],
  campaigns: any[],
  campaignGroups: any[],
  groupBy: string,
  selectedDimensions: string[]
): ReportEvent[] {
  // Filter out rows without valid period or events
  const validData = aggregatedData.filter(row => {
    const hasValidPeriod = row.period_start && new Date(row.period_start).getTime() > 0;
    const hasEvents = Number(row.page_views) + Number(row.cta_clicks) + Number(row.pin_clicks) > 0;
    return hasValidPeriod && hasEvents;
  });

  if (validData.length === 0) return [];

  const result: ReportEvent[] = validData.map(row => {
    const campaign = campaigns?.find(c => c.id === row.campaign_id);
    const campaignGroup = campaignGroups?.find(cg => cg.id === campaign?.campaign_group_id);
    const totalClicks = Number(row.cta_clicks) + Number(row.pin_clicks);
    const pageViews = Number(row.page_views);
    const ctr = pageViews > 0 ? (totalClicks / pageViews) * 100 : 0;

    return {
      period: formatPeriod(row.period_start, groupBy),
      campaignId: row.campaign_id,
      campaignName: campaign?.name || 'Unknown',
      campaignGroupName: campaignGroup?.name || 'Sem Grupo de Campanha',
      creativeName: campaign?.name || 'Unknown',
      campaignStatus: campaign?.status || 'active',
      campaignDescription: campaign?.description || '',
      campaignTags: '',
      insertionOrderName: (campaign as any)?.insertion_orders?.client_name || 'Sem Insertion Order',
      creativeFormat: campaign?.creative_format || 'Não definido',
      shortToken: campaign?.short_token || '',
      tagId: undefined,
      tagTitle: undefined,
      pageViews,
      ctaClicks: Number(row.cta_clicks),
      pinClicks: Number(row.pin_clicks),
      totalClicks,
      ctr: Number(ctr.toFixed(2))
    };
  });

  // Determine aggregation mode
  const shouldAggregateByGroup = selectedDimensions.includes('campaign_name') &&
    !selectedDimensions.includes('creative_name') &&
    !selectedDimensions.includes('campaign_tags');

  if (!shouldAggregateByGroup) {
    result.sort((a, b) => {
      const rowA = validData.find(r => r.campaign_id === a.campaignId);
      const rowB = validData.find(r => r.campaign_id === b.campaignId);
      if (rowA && rowB) {
        const ts = new Date(rowB.period_start).getTime() - new Date(rowA.period_start).getTime();
        if (ts !== 0) return ts;
      }
      const cg = a.campaignGroupName.localeCompare(b.campaignGroupName);
      if (cg !== 0) return cg;
      return a.creativeName.localeCompare(b.creativeName);
    });
    return result;
  }

  // Build period order map
  const periodOrderMap = new Map<string, number>();
  validData.forEach(row => {
    const p = formatPeriod(row.period_start, groupBy);
    if (!periodOrderMap.has(p)) {
      periodOrderMap.set(p, new Date(row.period_start).getTime());
    }
  });

  // Aggregate by period + campaign group
  const aggregatedMap = new Map<string, ReportEvent>();
  result.forEach(item => {
    const key = `${item.period}_${item.campaignGroupName}`;
    if (aggregatedMap.has(key)) {
      const existing = aggregatedMap.get(key)!;
      existing.pageViews += item.pageViews;
      existing.ctaClicks += item.ctaClicks;
      existing.pinClicks += item.pinClicks;
      existing.totalClicks = existing.ctaClicks + existing.pinClicks;
      existing.ctr = existing.pageViews > 0 ? Number(((existing.totalClicks / existing.pageViews) * 100).toFixed(2)) : 0;
      if (existing.insertionOrderName !== item.insertionOrderName) existing.insertionOrderName = 'Vários';
      if (existing.creativeFormat !== item.creativeFormat) existing.creativeFormat = 'Vários';
      if (existing.shortToken !== item.shortToken) existing.shortToken = 'Vários';
    } else {
      aggregatedMap.set(key, {
        ...item,
        campaignName: item.campaignGroupName,
        creativeName: 'Todos',
      });
    }
  });

  const finalResult = Array.from(aggregatedMap.values());
  finalResult.sort((a, b) => {
    const tsA = periodOrderMap.get(a.period) || 0;
    const tsB = periodOrderMap.get(b.period) || 0;
    const ts = tsB - tsA;
    if (ts !== 0) return ts;
    return a.campaignGroupName.localeCompare(b.campaignGroupName);
  });

  return finalResult;
}

export const useReportEvents = ({ selectedCampaignIds, dateRange, groupBy, selectedDimensions }: UseReportEventsProps) => {
  const MAX_CAMPAIGNS = 30;

  const effectiveDateRange = useMemo(() => {
    if (dateRange?.from && dateRange?.to) {
      return { from: dateRange.from, to: dateRange.to };
    }
    const to = new Date();
    const from = subDays(to, 30);
    return { from, to };
  }, [dateRange?.from?.getTime(), dateRange?.to?.getTime()]);

  const limitedCampaignIds = useMemo(() => {
    if (selectedCampaignIds.length > MAX_CAMPAIGNS) {
      console.warn(`Limiting report to ${MAX_CAMPAIGNS} campaigns (${selectedCampaignIds.length} selected).`);
      return selectedCampaignIds.slice(0, MAX_CAMPAIGNS);
    }
    return selectedCampaignIds;
  }, [selectedCampaignIds]);

  const startDate = effectiveDateRange.from.toISOString().split('T')[0];
  const endDate = effectiveDateRange.to.toISOString().split('T')[0];

  const query = useQuery({
    queryKey: ['report-events', limitedCampaignIds, startDate, endDate, groupBy, selectedDimensions],
    queryFn: async (): Promise<ReportEvent[]> => {
      // 1. Query materialized view ONLY (no fallback to events table)
      const { data: mvData, error: mvError } = await supabase
        .rpc('get_report_from_materialized_view' as any, {
          p_campaign_ids: limitedCampaignIds,
          p_start_date: startDate,
          p_end_date: endDate,
          p_group_by: groupBy
        });

      if (mvError) {
        throw new Error(`Erro ao buscar dados do relatório: ${mvError.message}`);
      }

      if (!mvData || mvData.length === 0) {
        return [];
      }

      // 2. Fetch campaign details for display
      const campaignIds = [...new Set(mvData.map((d: any) => d.campaign_id).filter(Boolean))] as string[];

      const [campaignsRes, campaignGroupsRes] = await Promise.all([
        supabase
          .from('campaigns')
          .select(`id, name, status, description, creative_format, short_token, campaign_group_id, insertion_orders (client_name)`)
          .in('id', campaignIds),
        supabase
          .from('campaigns')
          .select('campaign_group_id')
          .in('id', campaignIds)
          .then(async (res) => {
            const groupIds = [...new Set((res.data || []).map(c => c.campaign_group_id).filter(Boolean))];
            if (groupIds.length === 0) return { data: [], error: null };
            return supabase.from('campaign_groups').select('id, name').in('id', groupIds);
          })
      ]);

      if (campaignsRes.error) throw new Error(`Erro ao buscar campanhas: ${campaignsRes.error.message}`);

      return transformRows(mvData, campaignsRes.data || [], campaignGroupsRes.data || [], groupBy, selectedDimensions);
    },
    enabled: limitedCampaignIds.length > 0,
    staleTime: 10 * 60 * 1000,      // 10 min cache - only refresh on manual reload
    gcTime: 15 * 60 * 1000,          // 15 min gc
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
    retryDelay: (attempt) => Math.min(2000 * (attempt + 1), 10000),
  });

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
    isFetching: query.isFetching,
    isStale: query.isStale,
    dataUpdatedAt: query.dataUpdatedAt,
  };
};
