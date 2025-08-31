
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, startOfWeek, startOfMonth, format, subDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

export interface ReportEvent {
  period: string;
  campaignId: string;
  campaignName: string;
  campaignStatus: string;
  campaignDescription: string;
  campaignTags: string;
  insertionOrderName: string;
  creativeFormat: string;
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

// Função utilitária para classificar eventos baseado no tipo da tag
const classifyEventByTagType = (event: any, tagType: string) => {
  // Se o event_type já está correto, use ele
  if (event.event_type === 'page_view' || event.event_type === 'pin_click' || event.event_type === 'click') {
    return event.event_type;
  }
  
  // Para eventos antigos ou inconsistentes, classifique baseado no tipo da tag
  if (event.event_type === 'view') {
    switch (tagType) {
      case 'page-view':
        return 'page_view';
      case 'pin':
        return 'pin_click';
      case 'click-button':
        return 'click';
      default:
        return event.event_type;
    }
  }
  
  // Fallback para outros casos
  return event.event_type;
};

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
  }, [dateRange]);

  const fetchReportData = useCallback(async () => {
    if (selectedCampaignIds.length === 0) {
      setData([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Convert dates to proper format for the RPC
      const startDate = effectiveDateRange.from.toISOString().split('T')[0];
      const endDate = effectiveDateRange.to.toISOString().split('T')[0];
      
      // Determine if we need tag breakdown
      const needsTagBreakdown = selectedDimensions.includes('campaign_tags');
      
      // Use the new aggregated RPC - NO LIMITS!
      const { data: aggregatedData, error: aggregatedError } = await supabase
        .rpc('get_report_aggregated', {
          p_campaign_ids: selectedCampaignIds,
          p_start_date: startDate,
          p_end_date: endDate,
          p_group_by: groupBy,
          p_breakdown_by_tags: needsTagBreakdown
        });
      
      if (aggregatedError) {
        throw new Error(`Erro ao buscar dados agregados: ${aggregatedError.message}`);
      }
      
      console.log('Report aggregated data (unlimited):', aggregatedData);
      
      if (!aggregatedData || aggregatedData.length === 0) {
        setData([]);
        return;
      }
      
      // Fetch campaign details for display
      const campaignIds = [...new Set(aggregatedData.map(d => d.campaign_id).filter(Boolean))];
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select(`
          id,
          name,
          status,
          description,
          creative_format,
          insertion_orders (
            client_name
          )
        `)
        .in('id', campaignIds);
      
      if (campaignsError) {
        throw new Error(`Erro ao buscar campanhas: ${campaignsError.message}`);
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
          campaignName: campaign?.name || 'Unknown',
          campaignStatus: campaign?.status || 'active',
          campaignDescription: campaign?.description || '',
          campaignTags: needsTagBreakdown && row.tag_title ? row.tag_title : '',
          insertionOrderName: (campaign as any)?.insertion_orders?.client_name || 'Sem Insertion Order',
          creativeFormat: campaign?.creative_format || 'Não definido',
          tagId: needsTagBreakdown ? row.tag_id : undefined,
          tagTitle: needsTagBreakdown ? row.tag_title : undefined,
          pageViews,
          ctaClicks: Number(row.cta_clicks),
          pinClicks: Number(row.pin_clicks),
          totalClicks,
          ctr: Number(ctr.toFixed(2))
        };
      });
      
      // Sort by period using actual timestamp (most recent first) then by campaign name
      result.sort((a, b) => {
        // Find the original row data to get timestamp
        const rowA = validData.find(r => r.campaign_id === a.campaignId && 
          (a.tagId ? r.tag_id === a.tagId : !r.tag_id));
        const rowB = validData.find(r => r.campaign_id === b.campaignId && 
          (b.tagId ? r.tag_id === b.tagId : !r.tag_id));
        
        if (rowA && rowB) {
          const timestampCompare = new Date(rowB.period_start).getTime() - new Date(rowA.period_start).getTime();
          if (timestampCompare !== 0) return timestampCompare;
        }
        return a.campaignName.localeCompare(b.campaignName);
      });
      
      setData(result);
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [selectedCampaignIds, effectiveDateRange, groupBy, selectedDimensions]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  return { data, loading, error };
};
