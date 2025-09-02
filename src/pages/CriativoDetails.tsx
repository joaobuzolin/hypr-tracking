import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Breadcrumb, useBreadcrumbs } from "@/components/Breadcrumb";
import { UserMenu } from "@/components/UserMenu";
import { ArrowLeft, Copy, MousePointer, Eye, Calendar, TrendingUp, Download, Tag as TagIcon, Trash2, User, Activity, Settings, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AddTagDialog from "@/components/AddTagDialog";
import { EditCampaignDialog } from "@/components/EditCampaignDialog";
import { useCampaigns, type Tag } from "@/hooks/useCampaigns";
import { useInsertionOrders } from "@/hooks/useInsertionOrders";
import { supabase } from "@/integrations/supabase/client";

interface DailyMetric {
  date: string;
  cta_clicks: number;
  pin_clicks: number;
  page_views: number;
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

const formatDate = (dateString: string) => {
  // If it's already in YYYY-MM-DD format, convert directly to pt-BR format
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  }
  // Fallback for other formats
  return new Date(dateString).toLocaleDateString('pt-BR');
};

const calculateCTR = (clicks: number, pageViews: number) => {
  return pageViews > 0 ? ((clicks / pageViews) * 100).toFixed(2) : "0.00";
};

const CampaignDetails = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const { campaigns, loading, createTag, deleteTag, fetchCampaigns } = useCampaigns();
  const { insertionOrders } = useInsertionOrders();
  const { generateBreadcrumbs } = useBreadcrumbs();
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [isActive, setIsActive] = useState(false);
  
  // Real-time monitoring states
  const [realtimeStats, setRealtimeStats] = useState<any>({});
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const campaign = campaigns.find(c => c.id === id);
  const currentInsertionOrder = useMemo(() => {
    if (!campaign?.insertion_order_id) return null;
    return insertionOrders.find(io => io.id === campaign.insertion_order_id);
  }, [campaign, insertionOrders]);

  // Define functions before useEffect calls to avoid temporal dead zone
  const loadRealtimeStats = async () => {
    if (!campaign) return;
    
    setIsLoadingStats(true);
    try {
      const fifteenMinutesAgo = new Date();
      fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);

      const tagIds = campaign.tags.map(tag => tag.id);
      if (tagIds.length === 0) {
        setRealtimeStats({});
        return;
      }

      // Use RPC function to get aggregated counts without 1000-row limit
      const { data: realtimeData, error } = await supabase.rpc('get_realtime_event_counts', {
        p_tag_ids: tagIds,
        p_since: fifteenMinutesAgo.toISOString()
      });

      if (error) {
        console.error('Error fetching realtime stats:', error);
        return;
      }

      // Build stats object from RPC results
      const stats: any = {};
      campaign.tags.forEach(tag => {
        const tagData = realtimeData?.find(d => d.tag_id === tag.id);
        stats[tag.id] = {
          tag: tag,
          total: (tagData?.page_views || 0) + (tagData?.clicks || 0) + (tagData?.pin_clicks || 0),
          page_views: tagData?.page_views || 0,
          clicks: tagData?.clicks || 0,
          pin_clicks: tagData?.pin_clicks || 0,
          last_event: tagData?.last_event || null
        };
      });

      setRealtimeStats(stats);
    } catch (error) {
      console.error('Error loading realtime stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    if (!loading && campaigns.length === 0) {
      fetchCampaigns();
    }
  }, [loading, campaigns.length, fetchCampaigns]);

  useEffect(() => {
    const fetchDailyMetrics = async () => {
      if (!campaign) return;
      
      setLoadingMetrics(true);
      try {
        const tagIds = campaign.tags.map(tag => tag.id);
        
        if (tagIds.length === 0) {
          setDailyMetrics([]);
          setIsActive(false);
          return;
        }

        // Check for activity in last 24 hours for status
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const { data: recentEvents, error: recentError } = await supabase
          .from('events')
          .select('id')
          .in('tag_id', tagIds)
          .gte('created_at', twentyFourHoursAgo.toISOString())
          .limit(1);

        if (recentError) throw recentError;
        setIsActive(recentEvents && recentEvents.length > 0);

        // Calculate date range for last 7 days
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        
        const startDate = sevenDaysAgo.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];

        // Use get_report_aggregated RPC to fetch daily metrics
        const { data: reportData, error } = await supabase
          .rpc('get_report_aggregated', {
            p_campaign_ids: [campaign.id],
            p_start_date: startDate,
            p_end_date: endDate,
            p_group_by: 'day',
            p_breakdown_by_tags: false
          });

        if (error) throw error;

        // Transform the data to match DailyMetric interface
        const metricsArray = (reportData || []).map((row: any) => {
          // Convert period_start to local date string without timezone issues
          const periodStart = new Date(row.period_start);
          // Add timezone offset to get the correct local date
          const localDate = new Date(periodStart.getTime() + periodStart.getTimezoneOffset() * 60000);
          const year = localDate.getFullYear();
          const month = String(localDate.getMonth() + 1).padStart(2, '0');
          const day = String(localDate.getDate()).padStart(2, '0');
          const dateString = `${year}-${month}-${day}`;

          return {
            date: dateString,
            cta_clicks: Number(row.cta_clicks) || 0,
            pin_clicks: Number(row.pin_clicks) || 0,
            page_views: Number(row.page_views) || 0
          };
        }).sort((a, b) => b.date.localeCompare(a.date));

        setDailyMetrics(metricsArray);
      } catch (error) {
        console.error('Error fetching daily metrics:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as métricas diárias.",
          variant: "destructive"
        });
      } finally {
        setLoadingMetrics(false);
      }
    };

    fetchDailyMetrics();
  }, [campaign, toast]);


  // Real-time stats monitoring
  useEffect(() => {
    loadRealtimeStats();
    const interval = setInterval(loadRealtimeStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [campaign]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando campanha...</p>
        </div>
      </div>
    );
  }

  // Generate breadcrumbs
  const breadcrumbItems = generateBreadcrumbs();

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Campanha não encontrada</h1>
          <p className="text-muted-foreground mb-4">A campanha que você procura não existe.</p>
          <Link to="/criativos">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Criativos
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${type} copiado para a área de transferência`,
    });
  };

  const PROJECT_DOMAIN = 'wmwpzmpgaokjplhyyktv.supabase.co';

  const getPixelUrl = (tag: string, dspType: 'dv360' | 'xandr' | 'ttd' | 'combo') => {
    const baseUrl = `https://${PROJECT_DOMAIN}/functions/v1/track-event/${tag}`;
    
    switch (dspType) {
      case 'dv360':
        return `${baseUrl}&cb={dclid}&cb2=%25%25PATTERN:DV360_CLK_ID%25%25&cb3=%25%25PATTERN:DV360_UNIQUE_ID%25%25`;
      case 'xandr':
        return `${baseUrl}&cb={click_id}&cb2={external_data}&cb3={adv_id}`;
      case 'ttd':
        return `${baseUrl}&cb={click_id}&cb2={auction_id}&cb3={adgroup_id}`;
      case 'combo':
        return `${baseUrl}&cb={dclid}&cb2=%25%25PATTERN:DV360_CLK_ID%25%25&cb3={click_id}&cb4={external_data}&cb5={auction_id}`;
      default:
        return baseUrl;
    }
  };



  const getImgTag = (tag: string, dspType: 'dv360' | 'xandr' | 'ttd' | 'combo') => {
    const pixelUrl = getPixelUrl(tag, dspType);
    return `<img src="${pixelUrl}" width="1" height="1" style="display:none" />`;
  };

  const addTag = async (title: string, type: 'click-button' | 'pin' | 'page-view') => {
    const result = await createTag({
      campaign_id: campaign.id,
      type,
      title
    });
    
    if (result.error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar a tag.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Tag criada!",
        description: `Tag "${title}" (${type.toUpperCase()}) foi adicionada com sucesso.`,
      });
    }
  };

  const handleDeleteTag = async (tagId: string, tagTitle: string) => {
    const result = await deleteTag(tagId);
    
    if (result.error) {
      toast({
        title: "Erro",
        description: "Não foi possível deletar a tag.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Tag deletada!",
        description: `Tag "${tagTitle}" foi removida com sucesso.`,
      });
    }
  };

  const totalClicks = campaign.metrics.cta_clicks + campaign.metrics.pin_clicks;
  const ctaCTR = calculateCTR(campaign.metrics.cta_clicks, campaign.metrics.page_views);
  const pinCTR = calculateCTR(campaign.metrics.pin_clicks, campaign.metrics.page_views);
  const overallCTR = calculateCTR(totalClicks, campaign.metrics.page_views);

  const exportToCSV = () => {
    const headers = ['Data', 'Click Button', 'PIN Clicks', 'Page Views', 'CTR Click Button (%)', 'CTR PIN (%)'];
    const csvContent = [
      headers.join(','),
      ...dailyMetrics.map(row => [
        formatDate(row.date),
        row.cta_clicks,
        row.pin_clicks,
        row.page_views,
        calculateCTR(row.cta_clicks, row.page_views),
        calculateCTR(row.pin_clicks, row.page_views)
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `metricas-${campaign.name.toLowerCase().replace(/\s+/g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Arquivo exportado!",
      description: "Os dados foram exportados para CSV com sucesso.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Liquid Glass Header */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-white/50 border-b border-white/20 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Link to="/criativos">
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-semibold text-foreground">
                    {campaign.name}
                  </h1>
                  <Badge variant={isActive ? 'default' : 'secondary'}>
                    {isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{campaign.description}</p>
                <div className="flex items-center gap-4 mt-2">
                  <p className="text-xs text-muted-foreground">
                    Criada em {formatDate(campaign.created_at)} • 
                    Período: {formatDate(campaign.start_date)} até {formatDate(campaign.end_date)}
                  </p>
                  {campaign.profile && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      <span>Criado por: {campaign.profile.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/reports">
                <Button variant="outline" size="sm" className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Relatórios
                </Button>
              </Link>
              <UserMenu />
            </div>
          </div>
        </div>
      </div>

      {/* Content with top padding to account for fixed header */}
      <div className="pt-32">
        <div className="container mx-auto px-4 py-6">
          {/* Breadcrumb */}
          <Breadcrumb items={breadcrumbItems} />
          
          {/* Actions Bar */}
          <div className="flex items-center justify-between mb-6">
            <div></div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setEditDialogOpen(true)}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                Editar Criativo
              </Button>
              <Button onClick={exportToCSV} className="gap-2">
                <Download className="w-4 h-4" />
                Exportar CSV
              </Button>
            </div>
          </div>
          
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded">
                  <MousePointer className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-semibold">{campaign.metrics.cta_clicks}</div>
                  <div className="text-sm text-neutral-600">Click Button</div>
                  <div className="text-xs text-muted-foreground">CTR: {ctaCTR}%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded">
                  <Eye className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-semibold">{campaign.metrics.pin_clicks}</div>
                  <div className="text-sm text-neutral-600">PIN Clicks</div>
                  <div className="text-xs text-muted-foreground">CTR: {pinCTR}%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-semibold">{totalClicks}</div>
                  <div className="text-sm text-neutral-600">Total Clicks</div>
                  <div className="text-xs text-muted-foreground">CTR: {overallCTR}%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded">
                  <Eye className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-semibold">{campaign.metrics.page_views?.toLocaleString()}</div>
                  <div className="text-sm text-neutral-600">Page Views</div>
                  <div className="text-xs text-muted-foreground">Base para CTR</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Real-time stats widget */}
        {Object.keys(realtimeStats).length > 0 && (
          <Card className="border shadow-sm mb-6 section-surface">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Últimos 15 Minutos
                  <Badge variant="secondary" className="ml-2">
                    {String(Object.values(realtimeStats).reduce((acc: number, stat: any) => acc + (stat?.total || 0), 0))} eventos
                  </Badge>
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => loadRealtimeStats()} 
                  disabled={isLoadingStats}
                  className="gap-2"
                >
                  <Activity className={isLoadingStats ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
                  Recarregar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.values(realtimeStats).map((stat: any) => (
                  <div key={stat.tag.id} className="border rounded-lg p-3 bg-background">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm">{stat.tag.title}</div>
                      <Badge 
                        variant="outline" 
                        className={
                          stat.tag.type === 'click-button' ? "bg-blue-50 text-blue-700 border-blue-200" : 
                          stat.tag.type === 'pin' ? "bg-green-50 text-green-700 border-green-200" :
                          "bg-purple-50 text-purple-700 border-purple-200"
                        }
                      >
                        {stat.tag.type}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg font-semibold text-purple-600">{stat.page_views}</div>
                        <div className="text-xs text-muted-foreground">Views</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-blue-600">{stat.clicks}</div>
                        <div className="text-xs text-muted-foreground">Clicks</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-green-600">{stat.pin_clicks}</div>
                        <div className="text-xs text-muted-foreground">Pins</div>
                      </div>
                    </div>
                    {stat.last_event && (
                      <div className="text-xs text-muted-foreground text-center mt-2">
                        Último: {new Date(stat.last_event).toLocaleTimeString('pt-BR', { hour12: false })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border shadow-sm mb-6 section-surface">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TagIcon className="w-5 h-5" />
                  Tags de Tracking
                </CardTitle>
                <CardDescription>
                  Gerencie tags para rastreamento e integração com seu sistema
                </CardDescription>
              </div>
              <AddTagDialog onTagAdded={addTag} campaignName={campaign.name} />
            </div>
          </CardHeader>
          <CardContent>
            {campaign.tags.length === 0 ? (
              <div className="text-center p-8">
                <TagIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">Nenhuma tag criada</h3>
                <p className="text-muted-foreground mb-4">
                  Crie tags personalizadas para rastrear diferentes elementos da sua campanha
                </p>
                <AddTagDialog onTagAdded={addTag} campaignName={campaign.name} />
              </div>
            ) : (
              <div className="grid gap-4">
                {campaign.tags.map((tag) => (
                  <div key={tag.id} className="border rounded-lg p-4 bg-background">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="outline" 
                          className={
                            tag.type === 'click-button' ? "bg-blue-50 text-blue-700 border-blue-200" : 
                            tag.type === 'pin' ? "bg-green-50 text-green-700 border-green-200" :
                            "bg-purple-50 text-purple-700 border-purple-200"
                          }
                        >
                          {tag.type.toUpperCase()}
                        </Badge>
                        <div>
                          <h4 className="font-medium">{tag.title}</h4>
                          <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                            {tag.code}
                          </code>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-muted-foreground">
                          Criada em {formatDate(tag.created_at)}
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Deletar Tag</DialogTitle>
                              <DialogDescription>
                                Tem certeza que deseja deletar a tag "{tag.title}"? Esta ação não pode ser desfeita.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="flex justify-end gap-2 mt-4">
                              <DialogTrigger asChild>
                                <Button variant="outline">Cancelar</Button>
                              </DialogTrigger>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="destructive" 
                                  onClick={() => handleDeleteTag(tag.id, tag.title)}
                                >
                                  Deletar
                                </Button>
                              </DialogTrigger>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                     <div className="space-y-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium text-foreground">Universal Pixels (recomendado):</div>
                          
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(getPixelUrl(tag.code, 'combo'), `Universal URL (${tag.title})`)}
                            className="justify-start text-xs h-8"
                          >
                            <Copy className="w-3 h-3 mr-2" />
                            Universal URL
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(getImgTag(tag.code, 'combo'), `Universal IMG (${tag.title})`)}
                            className="justify-start text-xs h-8"
                          >
                            <Copy className="w-3 h-3 mr-2" />
                            Universal IMG
                          </Button>
                        </div>
                        <Separator className="my-3" />
                        <div className="text-sm font-medium text-foreground mb-2">DSPs Específicas:</div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 mb-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(getPixelUrl(tag.code, 'dv360'), `DV360 URL (${tag.title})`)}
                            className="justify-start text-xs h-8"
                          >
                            <Copy className="w-3 h-3 mr-2" />
                            DV360
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(getPixelUrl(tag.code, 'xandr'), `Xandr URL (${tag.title})`)}
                            className="justify-start text-xs h-8"
                          >
                            <Copy className="w-3 h-3 mr-2" />
                            Xandr
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(getPixelUrl(tag.code, 'ttd'), `TTD URL (${tag.title})`)}
                            className="justify-start text-xs h-8"
                          >
                            <Copy className="w-3 h-3 mr-2" />
                            TTD
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2 p-3 bg-muted/30 rounded-lg">
                          <div className="font-medium mb-1">💡 Implementação:</div>
                          <div>• <strong>Universal URLs</strong>: Inclui cachebusters de múltiplas DSPs para máxima cobertura</div>
                          <div>• <strong>DSPs Específicas</strong>: URLs otimizadas para cada plataforma (DV360, Xandr, TTD)</div>
                          <div>• <strong>Health Check</strong>: Use /health para verificar se a function está funcionando</div>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>


        <Card className="border shadow-sm section-surface">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Métricas Diárias
                </CardTitle>
                <CardDescription>
                  Performance dos últimos dias baseada em eventos reais
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {dailyMetrics.length > 0 ? `Últimos ${dailyMetrics.length} dias` : 'Sem dados'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loadingMetrics ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3"></div>
                <span className="text-muted-foreground">Carregando métricas...</span>
              </div>
            ) : dailyMetrics.length === 0 ? (
              <div className="text-center p-8">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">Nenhum evento registrado</h3>
                <p className="text-muted-foreground">
                  Quando houver eventos nas tags desta campanha, as métricas aparecerão aqui.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Data</TableHead>
                      <TableHead className="text-right">Click Button</TableHead>
                      <TableHead className="text-right">PIN Clicks</TableHead>
                      <TableHead className="text-right">Page Views</TableHead>
                      <TableHead className="text-right">CTR Click Button</TableHead>
                      <TableHead className="text-right">CTR PIN</TableHead>
                      <TableHead className="text-right">CTR Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyMetrics.map((day, index) => {
                      const totalDayClicks = day.cta_clicks + day.pin_clicks;
                      const dayCtaCTR = calculateCTR(day.cta_clicks, day.page_views);
                      const dayPinCTR = calculateCTR(day.pin_clicks, day.page_views);
                      const dayTotalCTR = calculateCTR(totalDayClicks, day.page_views);
                      
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {formatDate(day.date)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {day.cta_clicks}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {day.pin_clicks}
                          </TableCell>
                          <TableCell className="text-right">
                            {day.page_views.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-sm">{dayCtaCTR}%</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-sm">{dayPinCTR}%</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-sm font-medium">{dayTotalCTR}%</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Edit Campaign Dialog */}
      <EditCampaignDialog 
        campaign={campaign}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </div>
  );
};

export default CampaignDetails;
