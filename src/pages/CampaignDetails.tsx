import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Tag, TrendingUp, Eye, MousePointer, MapPin, Copy, ExternalLink, Trash2, CheckCircle, AlertCircle, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { AddTagDialog } from '@/components/AddTagDialog';
import { useToast } from '@/hooks/use-toast';
import { useCampaigns, type CampaignWithTags, type Tag } from '@/hooks/useCampaigns';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  classifyEventByTagType, 
  getTagLabel,
  getEventLabel,
  type TagType, 
  type EventType 
} from '@/lib/taxonomy';

interface EventLog {
  id: string;
  event_type: EventType;
  created_at: string;
  tag: {
    id: string;
    title: string;
    type: TagType;
    code: string;
  };
  user_agent?: string;
  ip_address?: string;
}

const CampaignDetails = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { campaigns, loading, fetchCampaigns, deleteTag } = useCampaigns();
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<CampaignWithTags | null>(null);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    if (campaigns && campaignId) {
      const foundCampaign = campaigns.find((c) => c.id === campaignId);
      setCampaign(foundCampaign || null);
    }
  }, [campaigns, campaignId]);

  useEffect(() => {
    if (campaignId) {
      fetchCampaigns();
    }
  }, [campaignId, fetchCampaigns]);

  useEffect(() => {
    fetchCampaignEvents();
  }, [campaign]);

  const fetchCampaignEvents = async () => {
    if (!campaign) return;
    
    try {
      setEventsLoading(true);
      
      const tagIds = campaign.tags.map(tag => tag.id);
      if (tagIds.length === 0) {
        setEvents([]);
        return;
      }

      const { data: eventsData, error } = await supabase
        .from('events')
        .select(`
          id,
          event_type,
          created_at,
          user_agent,
          ip_address,
          tag_id,
          tags!inner(id, title, type, code)
        `)
        .in('tag_id', tagIds)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Mapear os dados usando a taxonomia para garantir consistência
      const mappedEvents = (eventsData || []).map(event => ({
        id: event.id,
        event_type: classifyEventByTagType(event, (event as any).tags.type),
        created_at: event.created_at,
        user_agent: event.user_agent,
        ip_address: event.ip_address,
        tag: {
          id: (event as any).tags.id,
          title: (event as any).tags.title,
          type: (event as any).tags.type,
          code: (event as any).tags.code
        }
      }));

      setEvents(mappedEvents);
    } catch (error) {
      console.error('Error fetching campaign events:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os eventos da campanha.",
        variant: "destructive"
      });
    } finally {
      setEventsLoading(false);
    }
  };

  const handleTagCreated = async () => {
    await fetchCampaigns();
    toast({
      title: "Sucesso",
      description: "Tag criada com sucesso!",
    });
  };

  const generateTrackingCode = (tag: Tag) => {
    const baseUrl = window.location.origin;
    return `<img src="${baseUrl}/track-event?tag=${tag.code}" alt="tracking pixel" style="display:none;" />`;
  };

  const copyToClipboard = (text: string, successMessage: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        toast({
          title: "Copiado!",
          description: successMessage,
        });
      })
      .catch(err => {
        console.error("Failed to copy text: ", err);
        toast({
          title: "Erro",
          description: "Falha ao copiar o código para a área de transferência.",
          variant: "destructive"
        });
      });
  };

  const handleDeleteTag = async (tagId: string) => {
    const { error } = await deleteTag(tagId);
    if (error) {
      toast({
        title: "Erro",
        description: "Falha ao excluir a tag.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Tag excluída com sucesso!",
      });
    }
  };

  const renderEventIcon = (eventType: EventType) => {
    switch (eventType) {
      case 'page_view':
        return <Eye className="h-4 w-4 text-blue-500" />;
      case 'pin_click':
        return <MapPin className="h-4 w-4 text-green-500" />;
      case 'click':
        return <MousePointer className="h-4 w-4 text-purple-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <Skeleton className="h-10 w-full mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Informações da Campanha</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-4 w-48 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Log de Eventos</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex flex-col items-center justify-center h-96">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-muted-foreground">Campanha não encontrada</h2>
          <p className="text-muted-foreground">Verifique o ID da campanha ou volte para a lista de campanhas.</p>
          <Link to="/campaigns" className="mt-4 text-blue-500 hover:underline">
            Voltar para Campanhas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Liquid Glass Header */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-white/50 border-b border-white/20 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link to="/campaigns">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-semibold text-foreground mb-1">
                  {campaign.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Gerencie e monitore sua campanha
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {campaign.status === 'active' ? (
                <Button variant="secondary">
                  <Pause className="w-4 h-4 mr-2" />
                  Pausar Campanha
                </Button>
              ) : (
                <Button>
                  <Play className="w-4 h-4 mr-2" />
                  Ativar Campanha
                </Button>
              )}
              <Button variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                Acessar Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="pt-32">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Campaign Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Informações da Campanha
                </CardTitle>
                <CardDescription>
                  Detalhes e status geral da campanha
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Descrição</p>
                  <p className="text-muted-foreground text-sm">{campaign.description}</p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Status</p>
                  <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                    {campaign.status === 'active' ? 'Ativa' : 'Pausada'}
                  </Badge>
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Período</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(campaign.start_date), "dd/MM/yyyy")} - {format(new Date(campaign.end_date), "dd/MM/yyyy")}
                    </span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Criado em</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(campaign.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Tags Section - atualizada para usar taxonomia */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Tags de Rastreamento
                </CardTitle>
                <CardDescription>
                  Configure tags para diferentes tipos de interação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {campaign.tags.map((tag) => (
                    <div key={tag.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{tag.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {getTagLabel(tag.type)}
                          </Badge>
                        </div>
                        <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                          {tag.code}
                        </code>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(generateTrackingCode(tag), `Código da tag "${tag.title}" copiado!`)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Tag</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir a tag "{tag.title}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteTag(tag.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                  
                  <AddTagDialog 
                    campaignId={campaign.id} 
                    onTagCreated={handleTagCreated}
                    trigger={
                      <Button variant="outline" className="w-full">
                        <Tag className="h-4 w-4 mr-2" />
                        Adicionar Tag
                      </Button>
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Events Log - atualizado para usar taxonomia */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Log de Eventos (Últimos 100)
                </CardTitle>
                <CardDescription>
                  Eventos de rastreamento em tempo real
                </CardDescription>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum evento registrado ainda</p>
                    <p className="text-sm">Os eventos aparecerão aqui quando alguém interagir com suas tags</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {events.map((event) => (
                      <div key={event.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        {renderEventIcon(event.event_type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {getEventLabel(event.event_type)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {event.tag.title}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(event.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                            {event.ip_address && (
                              <span>IP: {event.ip_address}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetails;
