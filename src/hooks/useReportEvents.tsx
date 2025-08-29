
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, startOfWeek, startOfMonth, format, subDays } from 'date-fns';
import { 
  classifyEventByTagType, 
  type TagType, 
  type EventType 
} from '@/lib/taxonomy';

export interface ReportEvent {
  period: string;
  campaignId: string;
  campaignName: string;
  campaignStatus: string;
  campaignDescription: string;
  campaignTags: string;
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

        // 3. Fetch events for these tags within date range with tag information
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select(`
            *,
            tags!inner(type)
          `)
          .in('tag_id', allTagIds)
          .gte('created_at', effectiveDateRange.from.toISOString())
          .lte('created_at', effectiveDateRange.to.toISOString());

        if (eventsError) throw eventsError;

        // 4. Aggregate events by campaign/tag and time period
        const aggregateMap = new Map<string, ReportEvent>();
        const shouldBreakByTags = selectedDimensions.includes('campaign_tags');

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

          // Find the specific tag for this event
          const eventTag = campaign.tags?.find((tag: any) => tag.id === event.tag_id);
          const tagType = (event as any).tags?.type as TagType;
          
          let key: string;
          if (shouldBreakByTags && eventTag) {
            // Group by campaign, period, and tag
            key = `${campaign.id}-${periodStart.getTime()}-${eventTag.id}`;
          } else {
            // Group by campaign and period only
            key = `${campaign.id}-${periodStart.getTime()}`;
          }
          
          if (!aggregateMap.has(key)) {
            aggregateMap.set(key, {
              period: periodFormat,
              campaignId: campaign.id,
              campaignName: campaign.name,
              campaignStatus: campaign.status || 'active',
              campaignDescription: campaign.description || '',
              campaignTags: shouldBreakByTags && eventTag ? eventTag.title : campaign.tags?.map((tag: any) => tag.title).join(', ') || '',
              tagId: shouldBreakByTags && eventTag ? eventTag.id : undefined,
              tagTitle: shouldBreakByTags && eventTag ? eventTag.title : undefined,
              pageViews: 0,
              ctaClicks: 0,
              pinClicks: 0,
              totalClicks: 0,
              ctr: 0
            });
          }

          const aggregate = aggregateMap.get(key)!;

          // Usa a taxonomia para classificar o evento
          const classifiedEventType = classifyEventByTagType(event, tagType);

          // Count events by classified type usando taxonomia
          switch (classifiedEventType) {
            case 'page_view':
              aggregate.pageViews++;
              break;
            case 'click':
              aggregate.ctaClicks++;
              aggregate.totalClicks++;
              break;
            case 'pin_click':
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
  }, [selectedCampaignIds, effectiveDateRange, groupBy, selectedDimensions]);

  return { data, loading, error };
};
