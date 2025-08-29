import { useState, useEffect, useRef } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Copy, MousePointer, Eye, Calendar, TrendingUp, Download, Tag as TagIcon, Trash2, User, Radio, Activity } from "lucide-react";
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

interface RealtimeEvent {
  id: string;
  event_type: string;
  tag_id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  metadata: any;
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
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [isActive, setIsActive] = useState(false);
  
  // Real-time log states
  const [realtimeLogs, setRealtimeLogs] = useState<RealtimeEvent[]>([]);
  const [liveEnabled, setLiveEnabled] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTagId, setFilterTagId] = useState<string>('all');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [eventCount, setEventCount] = useState(0);
  const channelRef = useRef<any>(null);
  
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

        // Fetch metrics for last 7 days with tag information
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: events, error } = await supabase
          .from('events')
          .select(`
            event_type, 
            created_at,
            tag_id,
            tags!inner(type)
          `)
          .in('tag_id', tagIds)
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('created_at', { ascending: false });

        if (error) throw error;

        const groupedByDate = (events || []).reduce((acc, event) => {
          // Parse the date using local timezone instead of UTC
          const eventDate = new Date(event.created_at);
          const localDateString = eventDate.toLocaleDateString('pt-BR');
          // Convert back to YYYY-MM-DD format for consistency
          const [day, month, year] = localDateString.split('/');
          const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          
          if (!acc[date]) {
            acc[date] = { cta_clicks: 0, pin_clicks: 0, page_views: 0 };
          }

          const tagType = (event as any).tags?.type;
          const classifiedEventType = classifyEventByTagType(event, tagType);

          switch (classifiedEventType) {
            case 'click':
              acc[date].cta_clicks++;
              break;
            case 'pin_click':
              acc[date].pin_clicks++;
              break;
            case 'page_view':
              acc[date].page_views++;
              break;
          }

          return acc;
        }, {} as Record<string, { cta_clicks: number; pin_clicks: number; page_views: number }>);

        const metricsArray = Object.entries(groupedByDate)
          .map(([date, metrics]) => ({
            date,
            ...metrics
          }))
          .sort((a, b) => b.date.localeCompare(a.date));

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

  // Real-time logs functionality
  const loadInitialLogs = async () => {
    if (!campaign) return;
    
    const tagIds = campaign.tags.map(tag => tag.id);
    if (tagIds.length === 0) return;

    try {
      const { data: events, error } = await supabase
        .from('events')
        .select('id, tag_id, event_type, ip_address, user_agent, metadata, created_at')
        .in('tag_id', tagIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setRealtimeLogs((events || []) as RealtimeEvent[]);
      setEventCount(events?.length || 0);
    } catch (error) {
      console.error('Error loading initial logs:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!campaign || !liveEnabled) return;
    
    const tagIds = campaign.tags.map(tag => tag.id);
    if (tagIds.length === 0) return;

    setConnectionStatus('connecting');
    
    const channel = supabase
      .channel(`realtime:events:${campaign.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
          filter: `tag_id=in.(${tagIds.join(',')})`
        },
        (payload) => {
          console.log('Real-time event received:', payload);
          const newEvent = payload.new as RealtimeEvent;
          
          // Verify tag belongs to campaign
          if (tagIds.includes(newEvent.tag_id)) {
            setRealtimeLogs(prev => {
              const updated = [newEvent, ...prev].slice(0, 100);
              return updated;
            });
            setEventCount(prev => prev + 1);
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
        }
      });

    channelRef.current = channel;
  };

  const clearRealtimeSubscription = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setConnectionStatus('disconnected');
  };

  const toggleLive = () => {
    const newState = !liveEnabled;
    setLiveEnabled(newState);
    
    if (newState) {
      setupRealtimeSubscription();
    } else {
      clearRealtimeSubscription();
    }
  };

  const clearLogs = () => {
    setRealtimeLogs([]);
    setEventCount(0);
  };

  const getTagInfo = (tagId: string) => {
    const tag = campaign?.tags.find(t => t.id === tagId);
    return tag ? { title: tag.title, code: tag.code, type: tag.type } : null;
  };

  const getEventTypeBadge = (eventType: string) => {
    const variants = {
      'click': 'bg-blue-50 text-blue-700 border-blue-200',
      'click_button': 'bg-blue-50 text-blue-700 border-blue-200',
      'cta_click': 'bg-blue-50 text-blue-700 border-blue-200',
      'page_view': 'bg-purple-50 text-purple-700 border-purple-200',
      'pin_click': 'bg-green-50 text-green-700 border-green-200',
      'view': 'bg-green-50 text-green-700 border-green-200',
      'map_pin': 'bg-green-50 text-green-700 border-green-200'
    };
    
    return variants[eventType as keyof typeof variants] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const filteredLogs = realtimeLogs.filter(log => {
    if (filterType !== 'all' && log.event_type !== filterType) return false;
    if (filterTagId !== 'all' && log.tag_id !== filterTagId) return false;
    return true;
  });

  useEffect(() => {
    loadInitialLogs();
  }, [campaign]);

  useEffect(() => {
    return () => {
      clearRealtimeSubscription();
    };
  }, []);

  useEffect(() => {
    if (liveEnabled && campaign) {
      setupRealtimeSubscription();
    } else {
      clearRealtimeSubscription();
    }
  }, [liveEnabled, campaign]);
  
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
    `fetch("https://wmwpzmpgaokjplhyyktv.supabase.co/functions/v1/track-event?tag=${tag}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    metadata: { ua: navigator.userAgent, timestamp: Date.now() }
  })
}).catch(err => console.log('Tracking error:', err))`;

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
            <Button onClick={exportToCSV} className="gap-2">
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Content with top padding to account for fixed header */}
      <div className="pt-32">
        <div className="container mx-auto px-4 py-6">
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

        {/* Real-time Log Section */}
        <Card className="border shadow-sm mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Real-time Log
                  {eventCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {eventCount} eventos
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Acompanhe em tempo real todos os disparos das suas tags
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Radio className={`w-3 h-3 ${connectionStatus === 'connected' ? 'text-green-500' : connectionStatus === 'connecting' ? 'text-yellow-500' : 'text-gray-400'}`} />
                  <span className="text-muted-foreground">
                    {connectionStatus === 'connected' ? 'Conectado' : 
                     connectionStatus === 'connecting' ? 'Conectando...' : 'Pausado'}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4 mb-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Label htmlFor="live-toggle" className="text-sm font-medium">Ao vivo</Label>
                <Switch
                  id="live-toggle"
                  checked={liveEnabled}
                  onCheckedChange={toggleLive}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Tipo:</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="page_view">Page View</SelectItem>
                    <SelectItem value="click">Click</SelectItem>
                    <SelectItem value="click_button">Click Button</SelectItem>
                    <SelectItem value="pin_click">PIN Click</SelectItem>
                    <SelectItem value="cta_click">CTA Click</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Tag:</Label>
                <Select value={filterTagId} onValueChange={setFilterTagId}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {campaign.tags.map(tag => (
                      <SelectItem key={tag.id} value={tag.id}>
                        {tag.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearLogs}
                disabled={realtimeLogs.length === 0}
              >
                Limpar
              </Button>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum evento encontrado</p>
                <p className="text-sm">
                  {liveEnabled ? 'Aguardando novos eventos...' : 'Ative o modo ao vivo para monitorar eventos'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredLogs.map((log) => {
                  const tagInfo = getTagInfo(log.tag_id);
                  return (
                    <div 
                      key={log.id} 
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-muted-foreground font-mono">
                          {new Date(log.created_at).toLocaleString('pt-BR', { 
                            hour12: false,
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </div>
                        <Badge 
                          variant="outline" 
                          className={getEventTypeBadge(log.event_type)}
                        >
                          {log.event_type}
                        </Badge>
                        {tagInfo && (
                          <div className="text-sm">
                            <span className="font-medium">{tagInfo.title}</span>
                            <code className="ml-2 text-xs bg-muted px-1 py-0.5 rounded font-mono">
                              {tagInfo.code}
                            </code>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <div>IP: {log.ip_address || 'N/A'}</div>
                        <div className="max-w-48 truncate" title={log.user_agent || 'N/A'}>
                          UA: {log.user_agent || 'N/A'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

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
    </div>
  );
};

export default CampaignDetails;
