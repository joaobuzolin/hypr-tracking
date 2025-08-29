import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Copy, MousePointer, Eye, Calendar, TrendingUp, Download, Tag as TagIcon, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AddTagDialog from "@/components/AddTagDialog";
import { useCampaigns, type Tag } from "@/hooks/useCampaigns";
import { supabase } from "@/integrations/supabase/client";


interface DailyMetric {
  date: string;
  cta_clicks: number;
  pin_clicks: number;
  page_views: number;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};

const calculateCTR = (clicks: number, pageViews: number) => {
  return pageViews > 0 ? ((clicks / pageViews) * 100).toFixed(2) : "0.00";
};

const CampaignDetails = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const { campaigns, loading, createTag, deleteTag, fetchCampaigns } = useCampaigns();
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  
  // Encontrar a campanha pelo ID
  const campaign = campaigns.find(c => c.id === id);

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
          return;
        }

        // Buscar eventos dos últimos 7 dias
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: events, error } = await supabase
          .from('events')
          .select('event_type, created_at')
          .in('tag_id', tagIds)
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Agrupar eventos por data
        const groupedByDate = (events || []).reduce((acc, event) => {
          const date = new Date(event.created_at).toISOString().split('T')[0];
          
          if (!acc[date]) {
            acc[date] = { cta_clicks: 0, pin_clicks: 0, page_views: 0 };
          }

          switch (event.event_type) {
            case 'click_button':
            case 'cta_click':
              acc[date].cta_clicks++;
              break;
            case 'pin_click':
            case 'map_pin':
              acc[date].pin_clicks++;
              break;
            case 'page_view':
              acc[date].page_views++;
              break;
          }

          return acc;
        }, {} as Record<string, { cta_clicks: number; pin_clicks: number; page_views: number }>);

        // Converter para array e ordenar por data
        const metricsArray = Object.entries(groupedByDate)
          .map(([date, metrics]) => ({
            date,
            ...metrics
          }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Campanha não encontrada</h1>
          <p className="text-muted-foreground mb-4">A campanha que você procura não existe.</p>
          <Link to="/campaigns">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Campanhas
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

  const getPixelUrl = (tag: string) => 
    `https://wmwpzmpgaokjplhyyktv.supabase.co/functions/v1/track-event?tag=${tag}&cb=` + "${timestamp}";

  const getJsSnippet = (tag: string) => 
    `fetch("https://wmwpzmpgaokjplhyyktv.supabase.co/functions/v1/track-event", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  mode: "no-cors",
  body: JSON.stringify({
    tag: "${tag}",
    metadata: { ua: navigator.userAgent }
  })
})`;

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

  // Cálculos de métricas (CTR = total clicks / page views)
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
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Link to="/campaigns">
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
                  <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                    {campaign.status === 'active' ? 'Ativa' : 'Pausada'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{campaign.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Criada em {formatDate(campaign.created_at)} • 
                  Período: {formatDate(campaign.start_date)} até {formatDate(campaign.end_date)}
                </p>
              </div>
            </div>
            <Button onClick={exportToCSV} className="gap-2">
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Métricas Resumidas */}
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

        {/* Tags de Tracking */}
        <Card className="border shadow-sm mb-6">
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
                  <div key={tag.id} className="border rounded-lg p-4">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(getPixelUrl(tag.code), `Pixel URL (${tag.title})`)}
                        className="justify-start text-xs h-8"
                      >
                        <Copy className="w-3 h-3 mr-2" />
                        Copiar Pixel URL
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(getJsSnippet(tag.code), `JS Snippet (${tag.title})`)}
                        className="justify-start text-xs h-8"
                      >
                        <Copy className="w-3 h-3 mr-2" />
                        Copiar JS Snippet
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabela de Métricas Diárias */}
        <Card className="border shadow-sm">
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
  );
};

export default CampaignDetails;