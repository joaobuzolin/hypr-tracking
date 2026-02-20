
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, startOfWeek, startOfMonth, format, subDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

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


export const useReportEvents = ({ selectedCampaignIds, dateRange, groupBy, selectedDimensions }: UseReportEventsProps) => {
  const [data, setData] = useState<ReportEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveDateRange = useMemo(() => {
    if (dateRange?.from && dateRange?.to) {
      return { from: dateRange.from, to: dateRange.to };
    }
    // Default to last 30 days
    const to = new Date();
    const from = subDays(to, 30);
    return { from, to };
  }, [dateRange?.from?.getTime(), dateRange?.to?.getTime()]);

  const fetchReportData = useCallback(async () => {
    if (selectedCampaignIds.length === 0) {
      setData([]);
      return;
    }

    // Safety limit: prevent querying too many campaigns at once (causes timeouts on 50M+ events)
    const MAX_CAMPAIGNS = 30;
    const limitedCampaignIds = selectedCampaignIds.length > MAX_CAMPAIGNS 
      ? selectedCampaignIds.slice(0, MAX_CAMPAIGNS) 
      : selectedCampaignIds;

    if (selectedCampaignIds.length > MAX_CAMPAIGNS) {
      console.warn(`Limiting report to ${MAX_CAMPAIGNS} campaigns (${selectedCampaignIds.length} selected). Select specific campaigns for complete data.`);
    }

    setLoading(true);
    setError(null);
    try {
      // Convert dates to proper format for the RPC
      const startDate = effectiveDateRange.from.toISOString().split('T')[0];
      const endDate = effectiveDateRange.to.toISOString().split('T')[0];
      
      // Try materialized view first (fast), fallback to events table if empty
      let aggregatedData: any[] | null = null;
      
      const { data: mvData, error: mvError } = await supabase
        .rpc('get_report_from_materialized_view' as any, {
          p_campaign_ids: limitedCampaignIds,
          p_start_date: startDate,
          p_end_date: endDate,
          p_group_by: groupBy
        });
      
      if (mvError) {
        console.warn('Materialized view query failed, falling back to events:', mvError.message);
      }
      
      // If materialized view returned data, use it
      if (!mvError && mvData && mvData.length > 0) {
        aggregatedData = mvData;
      } else {
        // Fallback to direct events query — limited to prevent timeouts
        console.log('Materialized view empty or failed, using get_report_from_events fallback');
        const { data: eventsData, error: eventsError } = await supabase
          .rpc('get_report_from_events' as any, {
            p_campaign_ids: limitedCampaignIds,
            p_start_date: startDate,
            p_end_date: endDate,
            p_group_by: groupBy
          });
        
        if (eventsError) {
          // Provide a friendlier error for timeouts
          if (eventsError.message.includes('statement timeout')) {
            throw new Error('A consulta demorou demais. Tente selecionar menos campanhas ou um período menor.');
          }
          throw new Error(`Erro ao buscar dados: ${eventsError.message}`);
        }
        aggregatedData = eventsData;
      }
      
      console.log('Report aggregated data:', aggregatedData?.length, 'rows');
      
      if (!aggregatedData || aggregatedData.length === 0) {
        setData([]);
        return;
      }
      
      // Fetch campaign details for display
      const campaignIds = [...new Set(aggregatedData.map((d: any) => d.campaign_id).filter(Boolean))] as string[];
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select(`
          id,
          name,
          status,
          description,
          creative_format,
          short_token,
          campaign_group_id,
          insertion_orders (
            client_name
          )
        `)
        .in('id', campaignIds);
      
      // Fetch campaign groups separately to avoid relationship ambiguity
      const campaignGroupIds = [...new Set(campaigns?.map(c => c.campaign_group_id).filter(Boolean))];
      const { data: campaignGroups, error: campaignGroupsError } = await supabase
        .from('campaign_groups')
        .select('id, name')
        .in('id', campaignGroupIds);
      
      if (campaignsError) {
        throw new Error(`Erro ao buscar campanhas: ${campaignsError.message}`);
      }
      
      if (campaignGroupsError) {
        throw new Error(`Erro ao buscar grupos de campanha: ${campaignGroupsError.message}`);
      }
      
      // Filter out rows without valid period_start or without any events
      const validData = aggregatedData.filter(row => {
        const hasValidPeriod = row.period_start && new Date(row.period_start).getTime() > 0;
        const hasEvents = Number(row.page_views) + Number(row.cta_clicks) + Number(row.pin_clicks) > 0;
        return hasValidPeriod && hasEvents;
      });

      console.debug('Report data filtering:', {
        original: aggregatedData.length,
        afterFilter: validData.length,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dateRange: { startDate, endDate }
      });

      // Transform the data to match our ReportEvent interface
      const result: ReportEvent[] = validData.map(row => {
        const campaign = campaigns?.find(c => c.id === row.campaign_id);
        const campaignGroup = campaignGroups?.find(cg => cg.id === campaign?.campaign_group_id);
        const totalClicks = Number(row.cta_clicks) + Number(row.pin_clicks);
        const pageViews = Number(row.page_views);
        const ctr = pageViews > 0 ? (totalClicks / pageViews) * 100 : 0;
        
        // Format period based on groupBy - use date only to avoid timezone issues
        let periodFormat: string;
        const periodDate = new Date(row.period_start);
        
        // Extract just the date parts to avoid timezone conversion issues
        const year = periodDate.getUTCFullYear();
        const month = periodDate.getUTCMonth();
        const day = periodDate.getUTCDate();
        const localDate = new Date(year, month, day);
        
        switch (groupBy) {
          case 'day':
            periodFormat = format(localDate, 'dd/MM/yyyy');
            break;
          case 'week':
            periodFormat = `Semana ${format(localDate, 'dd/MM/yyyy')}`;
            break;
          case 'month':
            periodFormat = format(localDate, 'MM/yyyy');
            break;
          default:
            periodFormat = format(localDate, 'dd/MM/yyyy');
        }
        
        return {
          period: periodFormat,
          campaignId: row.campaign_id,
          campaignName: campaign?.name || 'Unknown', // This is now the creative name
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
      
      // Determine if we should aggregate by campaign group
      const shouldAggregateByGroup = selectedDimensions.includes('campaign_name') && 
                                   !selectedDimensions.includes('creative_name') &&
                                   !selectedDimensions.includes('campaign_tags');

      let finalResult: ReportEvent[];

      if (shouldAggregateByGroup) {
        // Create a period order map for correct sorting
        const periodOrderMap = new Map<string, number>();
        validData.forEach(row => {
          const periodDate = new Date(row.period_start);
          const year = periodDate.getUTCFullYear();
          const month = periodDate.getUTCMonth();
          const day = periodDate.getUTCDate();
          const localDate = new Date(year, month, day);
          
          let periodFormat: string;
          switch (groupBy) {
            case 'day':
              periodFormat = format(localDate, 'dd/MM/yyyy');
              break;
            case 'week':
              periodFormat = `Semana ${format(localDate, 'dd/MM/yyyy')}`;
              break;
            case 'month':
              periodFormat = format(localDate, 'MM/yyyy');
              break;
            default:
              periodFormat = format(localDate, 'dd/MM/yyyy');
          }
          
          if (!periodOrderMap.has(periodFormat)) {
            periodOrderMap.set(periodFormat, periodDate.getTime());
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
            existing.ctr = existing.pageViews > 0 ? (existing.totalClicks / existing.pageViews) * 100 : 0;
            existing.ctr = Number(existing.ctr.toFixed(2));
            
            // Handle multiple values - mark as "Vários" when different
            if (existing.insertionOrderName !== item.insertionOrderName) {
              existing.insertionOrderName = 'Vários';
            }
            if (existing.creativeFormat !== item.creativeFormat) {
              existing.creativeFormat = 'Vários';
            }
            if (existing.shortToken !== item.shortToken) {
              existing.shortToken = 'Vários';
            }
          } else {
            aggregatedMap.set(key, {
              ...item,
              campaignName: item.campaignGroupName, // Show group name as campaign name
              creativeName: 'Todos',
              totalClicks: item.ctaClicks + item.pinClicks,
              ctr: Number(item.ctr.toFixed(2))
            });
          }
        });
        
        finalResult = Array.from(aggregatedMap.values());
        
        // Sort aggregated results by period (most recent first) then by campaign group name
        finalResult.sort((a, b) => {
          const timestampA = periodOrderMap.get(a.period) || 0;
          const timestampB = periodOrderMap.get(b.period) || 0;
          const timestampCompare = timestampB - timestampA;
          if (timestampCompare !== 0) return timestampCompare;
          return a.campaignGroupName.localeCompare(b.campaignGroupName);
        });
      } else {
        // No aggregation - sort individual results
        result.sort((a, b) => {
          // Find the original row data to get timestamp
          const rowA = validData.find(r => r.campaign_id === a.campaignId);
          const rowB = validData.find(r => r.campaign_id === b.campaignId);
          
          if (rowA && rowB) {
            const timestampCompare = new Date(rowB.period_start).getTime() - new Date(rowA.period_start).getTime();
            if (timestampCompare !== 0) return timestampCompare;
          }
          // Sort by campaign group name, then by creative name
          const campaignGroupCompare = a.campaignGroupName.localeCompare(b.campaignGroupName);
          if (campaignGroupCompare !== 0) return campaignGroupCompare;
          return a.creativeName.localeCompare(b.creativeName);
        });
        
        finalResult = result;
      }
      
      setData(finalResult);
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(selectedCampaignIds), effectiveDateRange.from.getTime(), effectiveDateRange.to.getTime(), groupBy, JSON.stringify(selectedDimensions)]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  return { data, loading, error };
};
