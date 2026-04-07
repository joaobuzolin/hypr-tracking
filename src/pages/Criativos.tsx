import { useState, useMemo, useCallback, useDeferredValue, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { CampaignCard } from "@/components/CampaignCard";
import { MetricsCard } from "@/components/MetricsCard";
import { CreateCriativoDialog } from "@/components/CreateCriativoDialog";
import { PaginationControls } from "@/components/PaginationControls";
import { useBreadcrumbs } from "@/components/Breadcrumb";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useCampaignGroups } from "@/hooks/useCampaignGroups";
import { useInsertionOrders } from "@/hooks/useInsertionOrders";
import { useProfiles } from "@/hooks/useProfiles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, BarChart3, MousePointer, Search, CalendarIcon, Filter, User, Activity, Building, Users, Target, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useParams, useNavigate } from "react-router-dom";
import { format, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

import React from "react";

const Criativos = () => {
  const { campaigns, loading, createCampaign, isFetching } = useCampaigns();
  const { insertionOrders } = useInsertionOrders();
  const { campaignGroups } = useCampaignGroups();
  const { profiles } = useProfiles();
  const { insertionOrderId, campaignGroupId } = useParams();
  const { generateBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [creatorFilter, setCreatorFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [insertionOrderFilter, setInsertionOrderFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [campaignsWithEvents, setCampaignsWithEvents] = useState<string[]>([]);
  const [filteredMetrics, setFilteredMetrics] = useState<{
    totalPageViews: number;
    totalCtaClicks: number;
    totalPinClicks: number;
  } | null>(null);
  const [campaignMetricsMap, setCampaignMetricsMap] = useState<Map<string, {
    cta_clicks: number;
    pin_clicks: number;
    page_views: number;
  }>>(new Map());
  const itemsPerPage = 20;
  
  // Get current campaign group if we're in that context
  const currentCampaignGroup = useMemo(() => {
    if (!campaignGroupId) return null;
    return campaignGroups.find(cg => cg.id === campaignGroupId);
  }, [campaignGroupId, campaignGroups]);

  // Filter campaigns by campaign group if specified in URL
  const relevantCampaigns = useMemo(() => {
    if (!campaignGroupId) return campaigns;
    return campaigns.filter(campaign => campaign.campaign_group_id === campaignGroupId);
  }, [campaigns, campaignGroupId]);

  // Get unique insertion orders for filter
  const uniqueInsertionOrders = useMemo(() => {
    const ioIds = campaigns
      .map(c => c.insertion_order_id)
      .filter(Boolean)
      .filter((id, index, arr) => arr.indexOf(id) === index);
    
    return ioIds.map(id => {
      const io = insertionOrders.find(io => io.id === id);
      return io ? { id, name: io.client_name } : null;
    }).filter(Boolean) as { id: string; name: string }[];
  }, [campaigns, insertionOrders]);

  // Get unique campaigns for filter
  const uniqueCampaigns = useMemo(() => {
    if (campaignGroupId) return [];
    const campaigns = relevantCampaigns
      .filter(c => c.campaign_group)
      .map(c => ({ id: c.campaign_group_id!, name: c.campaign_group!.name }))
      .filter((cg, index, arr) => arr.findIndex(item => item.id === cg.id) === index);
    return campaigns.sort((a, b) => a.name.localeCompare(b.name));
  }, [relevantCampaigns, campaignGroupId]);

  // Get unique creators for filter options - show all registered users
  const uniqueCreators = useMemo(() => {
    if (profiles.length > 0) {
      return profiles.map(p => p.email).sort();
    }
    const creators = relevantCampaigns
      .filter(c => c.profile?.email)
      .map(c => c.profile!.email)
      .filter((email, index, arr) => arr.indexOf(email) === index);
    return creators.sort();
  }, [profiles, relevantCampaigns]);

  // Fetch campaigns with events in date range and their metrics
  useEffect(() => {
    const fetchFilteredData = async () => {
      if (!dateRange?.from) {
        setCampaignsWithEvents([]);
        setFilteredMetrics(null);
        setCampaignMetricsMap(new Map());
        return;
      }

      const startDate = startOfDay(dateRange.from);
      const endDate = endOfDay(dateRange.to || dateRange.from);

      const { data, error } = await supabase.rpc('get_campaigns_with_events_in_daterange', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString()
      });

      if (error) {
        console.error('Error fetching campaigns with events:', error);
        setCampaignsWithEvents([]);
        setCampaignMetricsMap(new Map());
        setFilteredMetrics(null);
        return;
      }

      const relevantIds = relevantCampaigns.map(c => c.id);
      const filteredIds = data
        ?.map((row: { campaign_id: string }) => row.campaign_id)
        .filter((id: string) => relevantIds.includes(id)) || [];
      
      setCampaignsWithEvents(filteredIds);

      if (filteredIds.length === 0) {
        setCampaignMetricsMap(new Map());
        setFilteredMetrics(null);
        return;
      }

      const { data: individualMetrics, error: metricsError } = await supabase.rpc(
        'get_metrics_by_campaign_and_daterange',
        {
          p_campaign_ids: filteredIds,
          p_start_date: startDate.toISOString(),
          p_end_date: endDate.toISOString()
        }
      );

      if (!metricsError && individualMetrics) {
        const metricsMap = new Map(
          individualMetrics.map((m: any) => [
            m.campaign_id,
            {
              cta_clicks: Number(m.cta_clicks) || 0,
              pin_clicks: Number(m.pin_clicks) || 0,
              page_views: Number(m.page_views) || 0
            }
          ])
        );
        setCampaignMetricsMap(metricsMap);
      }

      const { data: aggData, error: aggError } = await supabase.rpc('get_aggregated_metrics_for_campaigns', {
        p_campaign_ids: filteredIds,
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString()
      });

      if (!aggError && aggData && aggData.length > 0) {
        setFilteredMetrics({
          totalPageViews: aggData[0].total_page_views,
          totalCtaClicks: aggData[0].total_cta_clicks,
          totalPinClicks: aggData[0].total_pin_clicks
        });
      }
    };

    fetchFilteredData();
  }, [dateRange, relevantCampaigns]);

  // Filtered campaigns based on all filters
  const filteredCampaigns = useMemo(() => {
    let campaignsToFilter = (insertionOrderId || campaignGroupId) ? relevantCampaigns : campaigns;
    
    return campaignsToFilter.filter(campaign => {
      const matchesSearch = 
        campaign.name.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
        (campaign.description && campaign.description.toLowerCase().includes(deferredSearchTerm.toLowerCase()));
      
      const matchesDateRange = !dateRange?.from || campaignsWithEvents.includes(campaign.id);
      
      const matchesCreator = 
        creatorFilter === "all" || 
        campaign.profile?.email === creatorFilter;
      
      const matchesCampaignGroup = 
        campaignFilter === "all" || 
        campaign.campaign_group_id === campaignFilter;
      
      const matchesStatus = 
        statusFilter === "all" || 
        campaign.derivedStatus === statusFilter;
      
      const matchesInsertionOrder = 
        insertionOrderId ||
        insertionOrderFilter === "all" || 
        campaign.insertion_order_id === insertionOrderFilter;
      
      return matchesSearch && matchesDateRange && matchesCreator && matchesCampaignGroup && matchesStatus && matchesInsertionOrder;
    });
  }, [campaigns, relevantCampaigns, deferredSearchTerm, dateRange, campaignsWithEvents, creatorFilter, campaignFilter, statusFilter, insertionOrderFilter, insertionOrderId]);
  
  // Enrich campaigns with filtered metrics when date range is active
  const campaignsWithFilteredMetrics = useMemo(() => {
    return filteredCampaigns.map(campaign => {
      if (dateRange?.from && campaignMetricsMap.has(campaign.id)) {
        const filteredMetrics = campaignMetricsMap.get(campaign.id)!;
        return {
          ...campaign,
          metrics: {
            ...campaign.metrics,
            cta_clicks: filteredMetrics.cta_clicks,
            pin_clicks: filteredMetrics.pin_clicks,
            page_views: filteredMetrics.page_views
          }
        };
      }
      return campaign;
    });
  }, [filteredCampaigns, campaignMetricsMap, dateRange]);
  
  // Pagination logic
  const totalPages = Math.ceil(campaignsWithFilteredMetrics.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCampaigns = campaignsWithFilteredMetrics.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchTerm, dateRange, creatorFilter, campaignFilter, statusFilter, insertionOrderFilter]);
  
  const totalCampaigns = filteredCampaigns.length;
  const activeCampaigns = filteredCampaigns.filter(c => c.derivedStatus === 'active').length;
  
  const totalPinClicks = filteredMetrics 
    ? filteredMetrics.totalPinClicks
    : filteredCampaigns.reduce((sum, c) => sum + c.metrics.pin_clicks, 0);
  
  const totalClickButton = filteredMetrics
    ? filteredMetrics.totalCtaClicks
    : filteredCampaigns.reduce((sum, c) => sum + c.metrics.cta_clicks, 0);
  
  const totalPageViews = filteredMetrics
    ? filteredMetrics.totalPageViews
    : filteredCampaigns.reduce((sum, c) => sum + c.metrics.page_views, 0);
  
  const totalClicks = totalPinClicks + totalClickButton;

  const clearFilters = () => {
    setSearchTerm("");
    setDateRange(undefined);
    setCreatorFilter("all");
    setCampaignFilter("all");
    setStatusFilter("all");
    setInsertionOrderFilter("all");
  };

  const handleCriativoCreated = useCallback(() => {}, []);

  const breadcrumbItems = generateBreadcrumbs();

  const DateRangePicker = () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !dateRange?.from && !dateRange?.to && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateRange?.from ? (
            dateRange.to ? (
              <>
                {format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}
              </>
            ) : (
              format(dateRange.from, "dd/MM/yyyy")
            )
          ) : (
            <span>Filtrar por data</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={dateRange?.from}
          selected={dateRange}
          onSelect={setDateRange}
          numberOfMonths={2}
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );

  const contextBar = currentCampaignGroup ? (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{currentCampaignGroup.name}</h2>
        </div>
        {currentCampaignGroup.description && (
          <p className="text-sm text-muted-foreground">{currentCampaignGroup.description}</p>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium">Trocar campanha:</Label>
        <Select 
          value={campaignGroupId || ""} 
          onValueChange={(value) => {
            if (value === "all") {
              navigate("/criativos");
            } else {
              navigate(`/campanhas/${value}/criativos`);
            }
          }}
        >
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Selecione uma campanha" />
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-md z-50">
            <SelectItem value="all">Todas as campanhas</SelectItem>
            {campaignGroups
              .filter(cg => !insertionOrderId || cg.insertion_order_id === insertionOrderId)
              .map((cg) => (
                <SelectItem key={cg.id} value={cg.id}>
                  {cg.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  ) : null;

  const actions = (
    <CreateCriativoDialog 
      onCriativoCreated={handleCriativoCreated} 
      insertionOrderId={insertionOrderId}
      campaignGroupId={campaignGroupId}
      createCampaign={createCampaign}
      campaignGroups={campaignGroups}
      insertionOrders={insertionOrders}
    />
  );

  return (
    <AppLayout
      subtitle="Gerencie seus criativos e acompanhe métricas de tracking"
      breadcrumbs={breadcrumbItems}
      actions={actions}
      contextBar={contextBar}
    >
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6 mb-6 md:mb-8">
        {(loading || isFetching) ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))
        ) : (
          <>
            <MetricsCard
              icon={BarChart3}
              value={totalCampaigns}
              label="Total de Criativos"
            />
            
            <MetricsCard
              icon={Activity}
              value={activeCampaigns}
              label="Criativos Ativos"
              className="bg-success/5 border-success/20"
              iconColor="text-success"
            />
            
            <MetricsCard
              icon={Target}
              value={totalPinClicks}
              label="Total Pin Clicks"
              className="bg-orange-500/5 border-orange-500/20"
              iconColor="text-orange-500"
            />
            
            <MetricsCard
              icon={MousePointer}
              value={totalClickButton}
              label="Total Click Button"
              className="bg-blue-500/5 border-blue-500/20"
              iconColor="text-blue-500"
            />
            
            <MetricsCard
              icon={Eye}
              value={totalPageViews}
              label="Total Page Views"
              className="bg-purple-500/5 border-purple-500/20"
              iconColor="text-purple-500"
            />
            
            <MetricsCard
              icon={MousePointer}
              value={totalClicks}
              label="Total de Clicks"
              className="bg-primary/5 border-primary/20"
              iconColor="text-primary"
            />
          </>
        )}
      </div>

      {/* Filters Section */}
      <Card className="mb-6 md:mb-8 mx-1 section-surface">
        <CardContent className="p-4 md:p-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 md:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar criativos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
              <div className="w-full">
                <DateRangePicker />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {!insertionOrderId && !campaignGroupId && (
                <Select value={insertionOrderFilter} onValueChange={setInsertionOrderFilter}>
                  <SelectTrigger className="w-full">
                    <Building className="w-4 h-4 mr-2 shrink-0" />
                    <SelectValue placeholder="Insertion Order" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-md z-50">
                    <SelectItem value="all">Todas as IOs</SelectItem>
                    {uniqueInsertionOrders.map((io) => (
                      <SelectItem key={io.id} value={io.id}>
                        <span className="truncate">{io.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={creatorFilter} onValueChange={setCreatorFilter}>
                <SelectTrigger className="w-full">
                  <User className="w-4 h-4 mr-2 shrink-0" />
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-md z-50">
                  <SelectItem value="all">Todos os criadores</SelectItem>
                  {uniqueCreators.map((creator) => (
                    <SelectItem key={creator} value={creator}>
                      <span className="truncate">{creator}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {!campaignGroupId && (
                <Select value={campaignFilter} onValueChange={setCampaignFilter}>
                  <SelectTrigger className="w-full">
                    <Users className="w-4 h-4 mr-2 shrink-0" />
                    <SelectValue placeholder="Campanha" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-md z-50">
                    <SelectItem value="all">Todas as campanhas</SelectItem>
                    {uniqueCampaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        <span className="truncate">{campaign.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <Activity className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-md z-50">
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="paused">Pausadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {(searchTerm || dateRange?.from || dateRange?.to || creatorFilter !== "all" || campaignFilter !== "all" || statusFilter !== "all" || insertionOrderFilter !== "all") && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {filteredCampaigns.length} resultado{filteredCampaigns.length !== 1 ? 's' : ''}
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs h-8"
                >
                  Limpar filtros
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Campaigns List */}
      <div className="space-y-6 px-1">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-lg md:text-xl font-semibold">
            Seus Criativos {currentCampaignGroup ? `- ${currentCampaignGroup.name}` : ''}
          </h2>
          <Badge variant="outline" className="shrink-0">
            {filteredCampaigns.length} criativo{filteredCampaigns.length !== 1 ? 's' : ''}
            {filteredCampaigns.length !== relevantCampaigns.length && (
              <span className="text-muted-foreground ml-1">de {relevantCampaigns.length}</span>
            )}
          </Badge>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 md:p-6">
                  <Skeleton className="h-24 md:h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <Card>
            <CardContent className="p-8 md:p-12 text-center">
              <div className="text-muted-foreground">
                {searchTerm || dateRange?.from || dateRange?.to || creatorFilter !== "all" || campaignFilter !== "all" || statusFilter !== "all" ? (
                  <>
                    <Filter className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 opacity-40" />
                    <p className="mb-4 text-sm md:text-base">Nenhum criativo encontrado com os filtros aplicados</p>
                    <Button 
                      variant="outline" 
                      onClick={clearFilters}
                      size="sm"
                    >
                      Limpar filtros
                    </Button>
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 opacity-40" />
                    <p className="mb-4 text-sm md:text-base">Nenhum criativo criado ainda</p>
                    <CreateCriativoDialog 
                      onCriativoCreated={handleCriativoCreated} 
                      insertionOrderId={insertionOrderId}
                      campaignGroupId={campaignGroupId}
                      createCampaign={createCampaign}
                      campaignGroups={campaignGroups}
                      insertionOrders={insertionOrders}
                    />
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4">
              {paginatedCampaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
            
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Criativos;
