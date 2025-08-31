import { useState, useMemo } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Download, Filter, CalendarIcon, FileSpreadsheet, FileText, Search, Eye, MousePointer, MapPin, Target, ChevronDown, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

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
  { id: 'insertion_order_name', label: 'Nome da Insertion Order' },
  { id: 'campaign_description', label: 'Descrição' },
  { id: 'campaign_tags', label: 'Tags' },
  { id: 'creative_format', label: 'Formato do Criativo' },
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
  dimensions: string[];
  metrics: string[];
  dateRange?: DateRange;
  groupBy: 'day' | 'week' | 'month';
}

const Reports = () => {
  const { campaigns, loading } = useCampaigns();
  const { insertionOrders } = useInsertionOrders();
  const { campaignGroups } = useCampaignGroups();
  const { toast } = useToast();
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    selectedCampaigns: [],
    selectedInsertionOrders: [],
    dimensions: ['campaign_name'],
    metrics: ['page_views', 'cta_clicks', 'pin_clicks', 'ctr'],
    groupBy: 'day'
  });

  // Get effective campaign selection based on filters
  const effectiveCampaignIds = useMemo(() => {
    let filteredCampaigns = [...campaigns];
    
    // Filter by selected insertion orders if any
    if (reportConfig.selectedInsertionOrders.length > 0) {
      filteredCampaigns = filteredCampaigns.filter(campaign => 
        reportConfig.selectedInsertionOrders.includes(campaign.insertion_order_id)
      );
    }
    
    // If specific campaigns are selected, use those, otherwise use filtered campaigns
    if (reportConfig.selectedCampaigns.length > 0) {
      return reportConfig.selectedCampaigns;
    }
    
    return filteredCampaigns.map(c => c.id);
  }, [campaigns, reportConfig.selectedCampaigns, reportConfig.selectedInsertionOrders]);

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
            row['Nome da Campanha'] = event.campaignName;
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

  const handleInsertionOrderToggle = (ioId: string, checked: boolean) => {
    setReportConfig(prev => ({
      ...prev,
      selectedInsertionOrders: checked 
        ? [...prev.selectedInsertionOrders, ioId]
        : prev.selectedInsertionOrders.filter(id => id !== ioId)
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

  const DateRangePicker = () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !reportConfig.dateRange?.from && !reportConfig.dateRange?.to && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {reportConfig.dateRange?.from ? (
            reportConfig.dateRange.to ? (
              <>
                {format(reportConfig.dateRange.from, "dd/MM/yy")} - {format(reportConfig.dateRange.to, "dd/MM/yy")}
              </>
            ) : (
              format(reportConfig.dateRange.from, "dd/MM/yyyy")
            )
          ) : (
            <span>Período</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={reportConfig.dateRange?.from}
          selected={reportConfig.dateRange}
          onSelect={(dateRange) => setReportConfig(prev => ({ ...prev, dateRange }))}
          numberOfMonths={2}
          className="p-3"
        />
      </PopoverContent>
    </Popover>
  );

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
                <Popover>
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
                  <PopoverContent className="w-full p-0" align="start">
                    <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
                      {insertionOrders.map((io) => (
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
                      ))}
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
                <Label className="text-sm font-medium">Campanhas Específicas</Label>
                <Popover>
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
                  <PopoverContent className="w-full p-0" align="start">
                    <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
                      {campaigns.map((campaign) => (
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
                              {campaign.description}
                            </p>
                          </div>
                        </div>
                      ))}
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
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <DateRangePicker />
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
              {eventsLoading ? (
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
                  <p className="text-sm text-muted-foreground">
                    {eventsError}
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