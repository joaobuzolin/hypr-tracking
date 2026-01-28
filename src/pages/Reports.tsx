import { useState, useMemo, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useInsertionOrders } from "@/hooks/useInsertionOrders";
import { useCampaignGroups } from "@/hooks/useCampaignGroups";
import { useReportEvents } from "@/hooks/useReportEvents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Download, Filter, FileSpreadsheet, FileText, Search, Eye, MousePointer, MapPin, Target, ChevronDown, X, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/DateRangePicker";

import * as XLSX from 'xlsx';

// Available metrics and dimensions
const availableMetrics = [
  { id: 'page_views', label: 'Page Views', icon: Eye },
  { id: 'cta_clicks', label: 'Click Buttons', icon: MousePointer },
  { id: 'pin_clicks', label: 'Map Pins', icon: MapPin },
  { id: 'ctr', label: 'CTR (%)', icon: Target },
  { id: 'total_clicks', label: 'Total Clicks', icon: MousePointer },
];

const availableDimensions = [
  { id: 'campaign_name', label: 'Nome da Campanha' },
  { id: 'creative_name', label: 'Nome do Criativo' },
  { id: 'insertion_order_name', label: 'Nome da Insertion Order' },
  { id: 'campaign_description', label: 'Descrição' },
  { id: 'campaign_tags', label: 'Tags' },
  { id: 'creative_format', label: 'Formato do Criativo' },
  { id: 'short_token', label: 'Short Token' },
];


interface Campaign {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused';
  start_date: string;
  end_date: string;
  created_at: string;
  metrics: {
    cta_clicks: number;
    pin_clicks: number;
    page_views: number;
    total_7d: number;
  };
}

interface ReportConfig {
  selectedCampaigns: string[];
  selectedInsertionOrders: string[];
  selectedCreatives: string[];
  dimensions: string[];
  metrics: string[];
  dateRange?: DateRange;
  groupBy: 'day' | 'week' | 'month';
  shortTokenFilter?: string;
}

const Reports = () => {
  const { campaigns, loading } = useCampaigns();
  const { insertionOrders } = useInsertionOrders();
  const { campaignGroups } = useCampaignGroups();
  const { toast } = useToast();
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    selectedCampaigns: [],
    selectedInsertionOrders: [],
    selectedCreatives: [],
    dimensions: ['campaign_name'],
    metrics: ['page_views', 'cta_clicks', 'pin_clicks', 'ctr'],
    groupBy: 'day',
    shortTokenFilter: ''
  });

  // Search states for filters
  const [ioSearchTerm, setIoSearchTerm] = useState("");
  const [campaignSearchTerm, setCampaignSearchTerm] = useState("");
  const [creativeSearchTerm, setCreativeSearchTerm] = useState("");

  // Get unique creatives from campaigns
  const availableCreatives = useMemo(() => {
    const creatives = campaigns.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      description: campaign.description
    }));
    
    // Remove duplicates by name
    const uniqueCreatives = creatives.filter((creative, index, self) => 
      index === self.findIndex(c => c.name === creative.name)
    );
    
    return uniqueCreatives;
  }, [campaigns]);

  // Filter campaigns for dropdown based on selected insertion orders
  const filteredCampaignsForDropdown = useMemo(() => {
    // Se não há Insertion Orders selecionadas, mostrar todas as campanhas
    if (reportConfig.selectedInsertionOrders.length === 0) {
      return campaigns;
    }
    
    // Filtrar campanhas que pertencem às IOs selecionadas
    // Considera tanto o insertion_order_id direto da campanha quanto
    // o insertion_order_id do campaign_group ao qual a campanha pertence
    return campaigns.filter(campaign => {
      // Check direct insertion_order_id on campaign
      if (campaign.insertion_order_id && reportConfig.selectedInsertionOrders.includes(campaign.insertion_order_id)) {
        return true;
      }
      
      // Check insertion_order_id via campaign_group
      const campaignGroup = campaignGroups.find(cg => cg.id === campaign.campaign_group_id);
      if (campaignGroup?.insertion_order_id && reportConfig.selectedInsertionOrders.includes(campaignGroup.insertion_order_id)) {
        return true;
      }
      
      return false;
    });
  }, [campaigns, reportConfig.selectedInsertionOrders, campaignGroups]);

  // Filtered lists for search
  const filteredInsertionOrders = useMemo(() => {
    if (!ioSearchTerm.trim()) return insertionOrders;
    const searchLower = ioSearchTerm.toLowerCase();
    return insertionOrders.filter(io => 
      io.client_name.toLowerCase().includes(searchLower)
    );
  }, [insertionOrders, ioSearchTerm]);

  const searchedCampaignsForDropdown = useMemo(() => {
    if (!campaignSearchTerm.trim()) return filteredCampaignsForDropdown;
    
    const searchLower = campaignSearchTerm.toLowerCase();
    // Split search into words for multi-word search (e.g., "boticario natal")
    const searchWords = searchLower.split(/\s+/).filter(word => word.length > 0);
    
    return filteredCampaignsForDropdown.filter(campaign => {
      // Collect all searchable text for this campaign
      const searchableTexts: string[] = [
        campaign.name.toLowerCase(),
        campaign.description?.toLowerCase() || '',
      ];
      
      // Add campaign group name
      const campaignGroup = campaignGroups.find(cg => cg.id === campaign.campaign_group_id);
      if (campaignGroup?.name) {
        searchableTexts.push(campaignGroup.name.toLowerCase());
      }
      
      // Add insertion order name
      const io = insertionOrders.find(io => io.id === campaign.insertion_order_id);
      if (io?.client_name) {
        searchableTexts.push(io.client_name.toLowerCase());
      }
      
      // Combine all searchable text
      const combinedText = searchableTexts.join(' ');
      
      // Check if ALL search words are found (allows "boticario natal" to match)
      return searchWords.every(word => combinedText.includes(word));
    });
  }, [filteredCampaignsForDropdown, campaignSearchTerm, insertionOrders, campaignGroups]);

  const filteredCreatives = useMemo(() => {
    if (!creativeSearchTerm.trim()) return availableCreatives;
    const searchLower = creativeSearchTerm.toLowerCase();
    return availableCreatives.filter(creative => 
      creative.name.toLowerCase().includes(searchLower) ||
      creative.description?.toLowerCase().includes(searchLower)
    );
  }, [availableCreatives, creativeSearchTerm]);

  // Check if report configuration is complete
  const isConfigIncomplete = useMemo(() => {
    return reportConfig.dimensions.length === 0;
  }, [reportConfig.dimensions]);

  // Get effective campaign selection based on filters
  const effectiveCampaignIds = useMemo(() => {
    let filteredCampaigns = [...campaigns];
    
    // Filter by selected insertion orders if any
    if (reportConfig.selectedInsertionOrders.length > 0) {
      filteredCampaigns = filteredCampaigns.filter(campaign => 
        reportConfig.selectedInsertionOrders.includes(campaign.insertion_order_id)
      );
    }
    
    // Filter by selected creatives if any
    if (reportConfig.selectedCreatives.length > 0) {
      filteredCampaigns = filteredCampaigns.filter(campaign => 
        reportConfig.selectedCreatives.includes(campaign.id)
      );
    }
    
    // Filter by short token if specified
    if (reportConfig.shortTokenFilter && reportConfig.shortTokenFilter.trim()) {
      filteredCampaigns = filteredCampaigns.filter(campaign => 
        campaign.short_token && 
        campaign.short_token.toLowerCase().includes(reportConfig.shortTokenFilter!.toLowerCase().trim())
      );
    }
    
    // If specific campaigns are selected, use those
    if (reportConfig.selectedCampaigns.length > 0) {
      return reportConfig.selectedCampaigns;
    }
    
    // Only return campaigns if there's at least one filter applied
    if (reportConfig.selectedInsertionOrders.length > 0 || 
        reportConfig.selectedCreatives.length > 0 ||
        (reportConfig.shortTokenFilter && reportConfig.shortTokenFilter.trim())) {
      return filteredCampaigns.map(c => c.id);
    }
    
    // Return empty array if no filters applied
    return [];
  }, [campaigns, reportConfig.selectedCampaigns, reportConfig.selectedInsertionOrders, reportConfig.selectedCreatives, reportConfig.shortTokenFilter]);

  // Fetch aggregated report data
  const { data: reportEvents, loading: eventsLoading, error: eventsError } = useReportEvents({
    selectedCampaignIds: effectiveCampaignIds,
    dateRange: reportConfig.dateRange?.from && reportConfig.dateRange?.to ? 
      { from: reportConfig.dateRange.from, to: reportConfig.dateRange.to } : undefined,
    groupBy: reportConfig.groupBy,
    selectedDimensions: reportConfig.dimensions
  });

  // Get selected campaigns data
  const selectedCampaignsData = useMemo(() => {
    if (effectiveCampaignIds.length === 0) return [];
    return campaigns.filter(campaign => 
      effectiveCampaignIds.includes(campaign.id)
    );
  }, [campaigns, effectiveCampaignIds]);

  // Generate report data from aggregated events
  const reportData = useMemo(() => {
    return reportEvents.map(event => {
      const row: any = {};
      
      // Always include Period as first column
      row['Período'] = event.period;
      
      // Add dimensions
      reportConfig.dimensions.forEach(dim => {
        switch (dim) {
          case 'campaign_name':
            row['Nome da Campanha'] = event.campaignGroupName;
            break;
          case 'creative_name':
            row['Nome do Criativo'] = event.creativeName;
            break;
          case 'insertion_order_name':
            row['Nome da Insertion Order'] = event.insertionOrderName;
            break;
          case 'campaign_description':
            row['Descrição'] = event.campaignDescription;
            break;
          case 'campaign_tags':
            row['Tags'] = event.campaignTags;
            break;
          case 'creative_format':
            row['Formato do Criativo'] = event.creativeFormat;
            break;
          case 'short_token':
            row['Short Token'] = event.shortToken || '-';
            break;
        }
      });

      // Add metrics
      reportConfig.metrics.forEach(metric => {
        switch (metric) {
          case 'page_views':
            row['Page Views'] = event.pageViews;
            break;
          case 'cta_clicks':
            row['Click Buttons'] = event.ctaClicks;
            break;
          case 'pin_clicks':
            row['Map Pins'] = event.pinClicks;
            break;
          case 'ctr':
            row['CTR (%)'] = event.ctr;
            break;
          case 'total_clicks':
            row['Total Clicks'] = event.totalClicks;
            break;
        }
      });

      return row;
    });
  }, [reportEvents, reportConfig]);

  // Clean up invalid campaign selections when IOs change
  useEffect(() => {
    if (reportConfig.selectedInsertionOrders.length > 0 && reportConfig.selectedCampaigns.length > 0) {
      const validCampaignIds = filteredCampaignsForDropdown.map(c => c.id);
      const invalidSelections = reportConfig.selectedCampaigns.filter(
        id => !validCampaignIds.includes(id)
      );
      
      if (invalidSelections.length > 0) {
        setReportConfig(prev => ({
          ...prev,
          selectedCampaigns: prev.selectedCampaigns.filter(
            id => validCampaignIds.includes(id)
          )
        }));
      }
    }
  }, [reportConfig.selectedInsertionOrders, filteredCampaignsForDropdown]);

  const handleInsertionOrderToggle = (ioId: string, checked: boolean) => {
    setReportConfig(prev => ({
      ...prev,
      selectedInsertionOrders: checked 
        ? [...prev.selectedInsertionOrders, ioId]
        : prev.selectedInsertionOrders.filter(id => id !== ioId)
    }));
  };

  const handleCreativeToggle = (creativeId: string, checked: boolean) => {
    setReportConfig(prev => ({
      ...prev,
      selectedCreatives: checked 
        ? [...prev.selectedCreatives, creativeId]
        : prev.selectedCreatives.filter(id => id !== creativeId)
    }));
  };

  const handleCampaignToggle = (campaignId: string, checked: boolean) => {
    setReportConfig(prev => ({
      ...prev,
      selectedCampaigns: checked 
        ? [...prev.selectedCampaigns, campaignId]
        : prev.selectedCampaigns.filter(id => id !== campaignId)
    }));
  };

  const handleDimensionToggle = (dimensionId: string, checked: boolean) => {
    setReportConfig(prev => ({
      ...prev,
      dimensions: checked 
        ? [...prev.dimensions, dimensionId]
        : prev.dimensions.filter(id => id !== dimensionId)
    }));
  };

  const handleMetricToggle = (metricId: string, checked: boolean) => {
    setReportConfig(prev => ({
      ...prev,
      metrics: checked 
        ? [...prev.metrics, metricId]
        : prev.metrics.filter(id => id !== metricId)
    }));
  };

  const exportToExcel = () => {
    if (reportData.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos uma campanha para exportar.",
        variant: "destructive"
      });
      return;
    }

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    
    const fileName = `relatorio-campanhas-${format(new Date(), 'dd-MM-yyyy-HH-mm')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast({
      title: "Sucesso!",
      description: `Relatório exportado como ${fileName}`,
    });
  };

  const exportToCSV = () => {
    if (reportData.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos uma campanha para exportar.",
        variant: "destructive"
      });
      return;
    }

    const ws = XLSX.utils.json_to_sheet(reportData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    const fileName = `relatorio-campanhas-${format(new Date(), 'dd-MM-yyyy-HH-mm')}.csv`;
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    
    toast({
      title: "Sucesso!",
      description: `Relatório exportado como ${fileName}`,
    });
  };

  // Stable callback for date range changes
  const handleDateRangeChange = useCallback((newRange: DateRange | undefined) => {
    setReportConfig(prev => ({ ...prev, dateRange: newRange }));
  }, []);

  return (
    <AppLayout 
      showReportsButton={false}
      backButton={{ href: "/criativos", label: "← Voltar" }}
    >
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Relatórios</h1>
        <p className="text-muted-foreground">Customize e exporte relatórios detalhados das suas campanhas</p>
      </div>
      
      {/* Actions Bar */}
      <div className="flex justify-end gap-3 mb-6">
        <Button 
          variant="outline" 
          onClick={exportToCSV}
          disabled={reportData.length === 0}
          className="gap-2"
        >
          <FileText className="w-4 h-4" />
          Exportar CSV
        </Button>
        <Button 
          onClick={exportToExcel}
          disabled={reportData.length === 0}
          className="gap-2"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Exportar Excel
        </Button>
      </div>
        
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Filtros Adicionais */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtros Adicionais
              </CardTitle>
              <CardDescription>
                Filtre por Insertion Orders e Campanhas específicas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Insertion Orders Multi-Select */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Insertion Orders</Label>
                <Popover onOpenChange={(open) => { if (!open) setIoSearchTerm(""); }}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between text-left font-normal"
                    >
                      <span className="truncate">
                        {reportConfig.selectedInsertionOrders.length === 0
                          ? "Selecione Insertion Orders"
                          : `${reportConfig.selectedInsertionOrders.length} selecionada(s)`}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="start">
                    <div className="p-3 border-b">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar IO..."
                          value={ioSearchTerm}
                          onChange={(e) => setIoSearchTerm(e.target.value)}
                          className="pl-9 h-8"
                        />
                      </div>
                    </div>
                    <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
                      {filteredInsertionOrders.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          Nenhuma IO encontrada
                        </p>
                      ) : (
                        filteredInsertionOrders.map((io) => (
                          <div key={io.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`io-${io.id}`}
                              checked={reportConfig.selectedInsertionOrders.includes(io.id)}
                              onCheckedChange={(checked) => 
                                handleInsertionOrderToggle(io.id, !!checked)
                              }
                            />
                            <Label 
                              htmlFor={`io-${io.id}`} 
                              className="text-sm cursor-pointer flex-1"
                            >
                              {io.client_name}
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                {reportConfig.selectedInsertionOrders.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {reportConfig.selectedInsertionOrders.map(ioId => {
                      const io = insertionOrders.find(i => i.id === ioId);
                      return io ? (
                        <Badge key={ioId} variant="secondary" className="text-xs">
                          {io.client_name}
                          <X 
                            className="ml-1 h-3 w-3 cursor-pointer" 
                            onClick={() => handleInsertionOrderToggle(ioId, false)}
                          />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              {/* Campaigns Multi-Select */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Campanhas</Label>
                <Popover onOpenChange={(open) => { if (!open) setCampaignSearchTerm(""); }}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between text-left font-normal"
                    >
                      <span className="truncate">
                        {reportConfig.selectedCampaigns.length === 0
                          ? "Selecione Campanhas"
                          : `${reportConfig.selectedCampaigns.length} selecionada(s)`}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="start">
                    <div className="p-3 border-b">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar campanha ou IO..."
                          value={campaignSearchTerm}
                          onChange={(e) => setCampaignSearchTerm(e.target.value)}
                          className="pl-9 h-8"
                        />
                      </div>
                    </div>
                    <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
                      {searchedCampaignsForDropdown.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          Nenhuma campanha encontrada
                        </p>
                      ) : (
                        searchedCampaignsForDropdown.map((campaign) => {
                          const io = insertionOrders.find(io => io.id === campaign.insertion_order_id);
                          const campaignGroup = campaignGroups.find(cg => cg.id === campaign.campaign_group_id);
                          const subtitle = io?.client_name || campaignGroup?.name || campaign.description || 'Sem grupo';
                          return (
                            <div key={campaign.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`campaign-${campaign.id}`}
                                checked={reportConfig.selectedCampaigns.includes(campaign.id)}
                                onCheckedChange={(checked) => 
                                  handleCampaignToggle(campaign.id, !!checked)
                                }
                              />
                              <div className="flex-1 min-w-0">
                                <Label 
                                  htmlFor={`campaign-${campaign.id}`} 
                                  className="text-sm cursor-pointer block"
                                >
                                  {campaign.name}
                                </Label>
                                <p className="text-xs text-muted-foreground truncate">
                                  {subtitle}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                {reportConfig.selectedCampaigns.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {reportConfig.selectedCampaigns.map(campaignId => {
                      const campaign = campaigns.find(c => c.id === campaignId);
                      return campaign ? (
                        <Badge key={campaignId} variant="secondary" className="text-xs">
                          {campaign.name}
                          <X 
                            className="ml-1 h-3 w-3 cursor-pointer" 
                            onClick={() => handleCampaignToggle(campaignId, false)}
                          />
                        </Badge>
                      ) : null;
                     })}
                  </div>
                )}
              </div>

              {/* Short Token Filter */}
              <div className="space-y-2">
                <Label htmlFor="shortToken" className="text-sm font-medium">
                  Buscar por Short Token
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="shortToken"
                    placeholder="Digite o short token"
                    value={reportConfig.shortTokenFilter || ''}
                    onChange={(e) => setReportConfig(prev => ({ 
                      ...prev, 
                      shortTokenFilter: e.target.value 
                    }))}
                    className="pl-10"
                  />
                </div>
                {reportConfig.shortTokenFilter && reportConfig.shortTokenFilter.trim() && (
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">
                      Token: {reportConfig.shortTokenFilter}
                      <X 
                        className="ml-1 h-3 w-3 cursor-pointer" 
                        onClick={() => setReportConfig(prev => ({ 
                          ...prev, 
                          shortTokenFilter: '' 
                        }))}
                      />
                    </Badge>
                  </div>
                )}
              </div>

              {/* Creative Formats Multi-Select */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Criativos</Label>
                <Popover onOpenChange={(open) => { if (!open) setCreativeSearchTerm(""); }}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between text-left font-normal"
                    >
                      <span className="truncate">
                        {reportConfig.selectedCreatives.length === 0
                          ? "Selecione Criativos"
                          : `${reportConfig.selectedCreatives.length} selecionado(s)`}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="start">
                    <div className="p-3 border-b">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar criativo..."
                          value={creativeSearchTerm}
                          onChange={(e) => setCreativeSearchTerm(e.target.value)}
                          className="pl-9 h-8"
                        />
                      </div>
                    </div>
                    <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
                      {filteredCreatives.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          Nenhum criativo encontrado
                        </p>
                      ) : (
                        filteredCreatives.map((creative) => (
                          <div key={creative.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`creative-${creative.id}`}
                              checked={reportConfig.selectedCreatives.includes(creative.id)}
                              onCheckedChange={(checked) => 
                                handleCreativeToggle(creative.id, !!checked)
                              }
                            />
                            <div className="flex-1 min-w-0">
                              <Label 
                                htmlFor={`creative-${creative.id}`} 
                                className="text-sm cursor-pointer block"
                              >
                                {creative.name}
                              </Label>
                              <p className="text-xs text-muted-foreground truncate">
                                {creative.description}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                {reportConfig.selectedCreatives.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {reportConfig.selectedCreatives.map(creativeId => {
                      const creative = availableCreatives.find(c => c.id === creativeId);
                      return creative ? (
                        <Badge key={creativeId} variant="secondary" className="text-xs">
                          {creative.name}
                          <X 
                            className="ml-1 h-3 w-3 cursor-pointer" 
                            onClick={() => handleCreativeToggle(creativeId, false)}
                          />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dimensions Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dimensões</CardTitle>
              <CardDescription>
                Selecione as dimensões a serem incluídas no relatório
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {availableDimensions.map((dimension) => (
                <div key={dimension.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={dimension.id}
                    checked={reportConfig.dimensions.includes(dimension.id)}
                    onCheckedChange={(checked) => handleDimensionToggle(dimension.id, !!checked)}
                  />
                  <Label htmlFor={dimension.id} className="text-sm cursor-pointer">
                    {dimension.label}
                  </Label>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Metrics Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Métricas</CardTitle>
              <CardDescription>
                Escolha as métricas a serem incluídas no relatório
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {availableMetrics.map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={metric.id}
                      checked={reportConfig.metrics.includes(metric.id)}
                      onCheckedChange={(checked) => handleMetricToggle(metric.id, !!checked)}
                    />
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <Label htmlFor={metric.id} className="text-sm cursor-pointer">
                      {metric.label}
                    </Label>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Date and Grouping */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configurações Temporais</CardTitle>
              <CardDescription>
                Configure período e agrupamento dos dados
              </CardDescription>
              
              {/* Disclaimer sobre retenção de dados */}
              <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  <strong>Dados disponíveis:</strong> Apenas os últimos 90 dias. 
                  Dados mais antigos são automaticamente deletados do sistema.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <DateRangePicker 
                  dateRange={reportConfig.dateRange} 
                  onDateSelect={handleDateRangeChange} 
                />
              </div>
              
              <div className="space-y-2">
                <Label>Agrupar por</Label>
                <Select
                  value={reportConfig.groupBy}
                  onValueChange={(value: 'day' | 'week' | 'month') => 
                    setReportConfig(prev => ({ ...prev, groupBy: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Dia</SelectItem>
                    <SelectItem value="week">Semana</SelectItem>
                    <SelectItem value="month">Mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">Preview do Relatório</CardTitle>
                  <CardDescription>
                    Visualize os dados antes de exportar
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  {reportData.length} linha{reportData.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isConfigIncomplete ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    Configure seu relatório
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Para visualizar os dados, selecione:
                  </p>
                  <ul className="text-sm text-muted-foreground text-left inline-block space-y-1">
                    <li className="flex items-center gap-2">
                      {reportConfig.dimensions.length > 0 ? (
                        <span className="text-green-500">✓</span>
                      ) : (
                        <span className="text-orange-500">○</span>
                      )}
                      <span>Uma ou mais dimensões</span>
                    </li>
                    <li className="flex items-center gap-2">
                      {reportConfig.metrics.length > 0 ? (
                        <span className="text-green-500">✓</span>
                      ) : (
                        <span className="text-orange-500">○</span>
                      )}
                      <span>Uma ou mais métricas</span>
                    </li>
                  </ul>
                </div>
              ) : eventsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : eventsError ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-destructive mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-destructive mb-2">
                    Erro ao carregar dados
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Ocorreu um erro técnico ao buscar os dados.
                  </p>
                  <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded max-w-md mx-auto">
                    {eventsError}
                  </p>
                </div>
              ) : effectiveCampaignIds.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Nenhum filtro selecionado</p>
                  <p className="text-sm">
                    Selecione pelo menos uma Insertion Order, Campanha ou Short Token para visualizar os dados
                  </p>
                </div>
              ) : reportData.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    Nenhum evento encontrado
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Não há eventos para os filtros selecionados ou não há dados suficientes
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(reportData[0]).map((column) => (
                          <TableHead key={column}>{column}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.map((row, index) => (
                        <TableRow key={index}>
                          {Object.values(row).map((value, cellIndex) => (
                            <TableCell key={cellIndex}>
                              {String(value)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Reports;