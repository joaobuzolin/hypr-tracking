import { useState, useMemo } from "react";
import { useCampaigns } from "@/hooks/useCampaigns";
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
import { Download, Filter, CalendarIcon, FileSpreadsheet, FileText, Search, Eye, MousePointer, MapPin, Target, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { METRIC_LABELS } from "@/lib/taxonomy";

import * as XLSX from 'xlsx';

// Available metrics and dimensions usando taxonomia centralizada
const availableMetrics = [
  { id: 'page_views', label: METRIC_LABELS.page_views, icon: Eye },
  { id: 'cta_clicks', label: METRIC_LABELS.cta_clicks, icon: MousePointer },
  { id: 'pin_clicks', label: METRIC_LABELS.pin_clicks, icon: MapPin },
  { id: 'ctr', label: METRIC_LABELS.ctr, icon: Target },
  { id: 'total_clicks', label: METRIC_LABELS.total_clicks, icon: MousePointer },
];

const availableDimensions = [
  { id: 'campaign_name', label: 'Nome da Campanha' },
  { id: 'campaign_status', label: 'Status da Campanha' },
  { id: 'campaign_description', label: 'Descrição' },
  { id: 'campaign_tags', label: 'Tags' },
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
  dimensions: string[];
  metrics: string[];
  dateRange?: DateRange;
  groupBy: 'day' | 'week' | 'month';
}

const Reports = () => {
  const { campaigns, loading } = useCampaigns();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    selectedCampaigns: [],
    dimensions: ['campaign_name', 'campaign_status'],
    metrics: ['page_views', 'cta_clicks', 'pin_clicks', 'ctr'],
    groupBy: 'day'
  });

  // Fetch aggregated report data
  const { data: reportEvents, loading: eventsLoading, error: eventsError } = useReportEvents({
    selectedCampaignIds: reportConfig.selectedCampaigns,
    dateRange: reportConfig.dateRange?.from && reportConfig.dateRange?.to ? 
      { from: reportConfig.dateRange.from, to: reportConfig.dateRange.to } : undefined,
    groupBy: reportConfig.groupBy,
    selectedDimensions: reportConfig.dimensions
  });

  // Filter campaigns based on search
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => 
      campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (campaign.description && campaign.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [campaigns, searchTerm]);

  // Get selected campaigns data
  const selectedCampaignsData = useMemo(() => {
    if (reportConfig.selectedCampaigns.length === 0) return [];
    return campaigns.filter(campaign => 
      reportConfig.selectedCampaigns.includes(campaign.id)
    );
  }, [campaigns, reportConfig.selectedCampaigns]);

  // Generate report data from aggregated events usando labels da taxonomia
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
          case 'campaign_status':
            row['Status'] = event.campaignStatus === 'active' ? 'Ativa' : 'Pausada';
            break;
          case 'campaign_description':
            row['Descrição'] = event.campaignDescription;
            break;
          case 'campaign_tags':
            row['Tags'] = event.campaignTags;
            break;
        }
      });

      // Add metrics usando labels da taxonomia
      reportConfig.metrics.forEach(metric => {
        switch (metric) {
          case 'page_views':
            row[METRIC_LABELS.page_views] = event.pageViews;
            break;
          case 'cta_clicks':
            row[METRIC_LABELS.cta_clicks] = event.ctaClicks;
            break;
          case 'pin_clicks':
            row[METRIC_LABELS.pin_clicks] = event.pinClicks;
            break;
          case 'ctr':
            row[METRIC_LABELS.ctr] = event.ctr;
            break;
          case 'total_clicks':
            row[METRIC_LABELS.total_clicks] = event.totalClicks;
            break;
        }
      });

      return row;
    });
  }, [reportEvents, reportConfig]);

  const handleCampaignToggle = (campaignId: string, checked: boolean) => {
    setReportConfig(prev => ({
      ...prev,
      selectedCampaigns: checked 
        ? [...prev.selectedCampaigns, campaignId]
        : prev.selectedCampaigns.filter(id => id !== campaignId)
    }));
  };

  const handleSelectAllCampaigns = () => {
    const allSelected = filteredCampaigns.length === reportConfig.selectedCampaigns.length;
    setReportConfig(prev => ({
      ...prev,
      selectedCampaigns: allSelected ? [] : filteredCampaigns.map(c => c.id)
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
    <div className="min-h-screen bg-background">
      {/* Fixed Liquid Glass Header */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-white/50 border-b border-white/20 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <Link to="/campaigns">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-semibold text-foreground mb-1">
                  Relatórios
                </h1>
                <p className="text-sm text-muted-foreground">
                  Customize e exporte relatórios detalhados das suas campanhas
                </p>
              </div>
            </div>
            <div className="flex gap-3">
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
          </div>
        </div>
      </div>

      {/* Content with top padding to account for fixed header */}
      <div className="pt-32">
        <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Campaign Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Seleção de Campanhas
                </CardTitle>
                <CardDescription>
                  Escolha as campanhas para incluir no relatório
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar campanhas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Campanhas disponíveis</Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleSelectAllCampaigns}
                    className="text-xs h-8"
                  >
                    {filteredCampaigns.length === reportConfig.selectedCampaigns.length ? 'Desmarcar' : 'Selecionar'} todas
                  </Button>
                </div>

                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {filteredCampaigns.map((campaign) => (
                    <div key={campaign.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id={campaign.id}
                        checked={reportConfig.selectedCampaigns.includes(campaign.id)}
                        onCheckedChange={(checked) => handleCampaignToggle(campaign.id, !!checked)}
                      />
                      <div className="flex-1 min-w-0">
                        <Label htmlFor={campaign.id} className="text-sm font-medium cursor-pointer">
                          {campaign.name}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {campaign.description}
                        </p>
                        <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'} className="mt-2 text-xs">
                          {campaign.status === 'active' ? 'Ativa' : 'Pausada'}
                        </Badge>
                      </div>
                    </div>
                  ))}
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

            {/* Additional Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filtros Adicionais</CardTitle>
                <CardDescription>
                  Configure filtros extras para o relatório
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Período</Label>
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
                      {reportConfig.selectedCampaigns.length === 0 
                        ? "Nenhuma campanha selecionada" 
                        : "Nenhum evento encontrado"
                      }
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {reportConfig.selectedCampaigns.length === 0 
                        ? "Selecione pelo menos uma campanha para visualizar o relatório"
                        : "Não há eventos para as campanhas e período selecionados"
                      }
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
        </div>
      </div>
    </div>
  );
};

export default Reports;
