import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, startOfWeek, startOfMonth, format, subDays } from 'date-fns';

export interface ReportEvent {
  period: string;
  campaignId: string;
  campaignName: string;
  campaignStatus: string;
  campaignDescription: string;
  campaignTags: string;
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
}

export const useReportEvents = ({ selectedCampaignIds, dateRange, groupBy }: UseReportEventsProps) => {
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

  useEffect(() => {
    if (selectedCampaignIds.length === 0) {
      setData([]);
      return;
    }

    const fetchReportData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch campaigns with their tags
        const { data: campaignsData, error: campaignError } = await supabase
          .from('campaigns')
          .select(`
            id,
            name,
            status,
            description,
            start_date,
            end_date,
            tags (
              id,
              code,
              type,
              title
            )
          `)
          .in('id', selectedCampaignIds);

        if (campaignError) throw campaignError;

        // 2. Get all tag IDs and create mapping
        const tagToCampaignMap = new Map<string, any>();
        const allTagIds: string[] = [];

        campaignsData?.forEach(campaign => {
          campaign.tags?.forEach((tag: any) => {
            tagToCampaignMap.set(tag.id, campaign);
            allTagIds.push(tag.id);
          });
        });

        if (allTagIds.length === 0) {
          setData([]);
          return;
        }

        // 3. Fetch events for these tags within date range
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .in('tag_id', allTagIds)
          .gte('created_at', effectiveDateRange.from.toISOString())
          .lte('created_at', effectiveDateRange.to.toISOString());

        if (eventsError) throw eventsError;

        // 4. Aggregate events by campaign and time period
        const aggregateMap = new Map<string, ReportEvent>();

        eventsData?.forEach(event => {
          const campaign = tagToCampaignMap.get(event.tag_id);
          if (!campaign) return;

          const eventDate = new Date(event.created_at);
          let periodStart: Date;
          let periodFormat: string;

          switch (groupBy) {
            case 'day':
              periodStart = startOfDay(eventDate);
              periodFormat = format(periodStart, 'dd/MM/yyyy');
              break;
            case 'week':
              periodStart = startOfWeek(eventDate, { weekStartsOn: 1 }); // Monday
              periodFormat = `Semana ${format(periodStart, 'dd/MM/yyyy')}`;
              break;
            case 'month':
              periodStart = startOfMonth(eventDate);
              periodFormat = format(periodStart, 'MM/yyyy');
              break;
            default:
              periodStart = startOfDay(eventDate);
              periodFormat = format(periodStart, 'dd/MM/yyyy');
          }

          const key = `${campaign.id}-${periodStart.getTime()}`;
          
          if (!aggregateMap.has(key)) {
            aggregateMap.set(key, {
              period: periodFormat,
              campaignId: campaign.id,
              campaignName: campaign.name,
              campaignStatus: campaign.status || 'active',
              campaignDescription: campaign.description || '',
              campaignTags: campaign.tags?.map((tag: any) => tag.title).join(', ') || '',
              pageViews: 0,
              ctaClicks: 0,
              pinClicks: 0,
              totalClicks: 0,
              ctr: 0
            });
          }

          const aggregate = aggregateMap.get(key)!;

          // Count events by type  
          switch (event.event_type) {
            case 'page_view':
            case 'view':
              aggregate.pageViews++;
              break;
            case 'click':
              // This maps to 'click-button' tags
              aggregate.ctaClicks++;
              aggregate.totalClicks++;
              break;
            case 'pin_click':
              // This maps to 'pin' tags
              aggregate.pinClicks++;
              aggregate.totalClicks++;
              break;
          }
          
          // Recalculate CTR
          aggregate.ctr = aggregate.pageViews > 0 
            ? Number(((aggregate.totalClicks / aggregate.pageViews) * 100).toFixed(2))
            : 0;
        });

        // 5. Convert to array and sort
        const resultData = Array.from(aggregateMap.values()).sort((a, b) => {
          // Sort by period first, then by campaign name
          const periodCompare = a.period.localeCompare(b.period);
          if (periodCompare !== 0) return periodCompare;
          return a.campaignName.localeCompare(b.campaignName);
        });

        setData(resultData);
      } catch (err) {
        console.error('Error fetching report data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [selectedCampaignIds, effectiveDateRange, groupBy]);

  return { data, loading, error };
};