import { useState } from "react";
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
import { ArrowLeft, Copy, MousePointer, Eye, Calendar, TrendingUp, Download, Tag as TagIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AddTagDialog from "@/components/AddTagDialog";

// Types
interface Tag {
  id: string;
  type: 'cta' | 'pin';
  title: string;
  code: string;
  created_at: string;
}

// Mock data para métricas detalhadas por dia
const mockDailyMetrics = [
  { date: "2024-01-15", cta_clicks: 45, pin_clicks: 32, impressions: 1250 },
  { date: "2024-01-14", cta_clicks: 38, pin_clicks: 29, impressions: 1180 },
  { date: "2024-01-13", cta_clicks: 52, pin_clicks: 35, impressions: 1320 },
  { date: "2024-01-12", cta_clicks: 41, pin_clicks: 28, impressions: 1150 },
  { date: "2024-01-11", cta_clicks: 48, pin_clicks: 31, impressions: 1280 },
  { date: "2024-01-10", cta_clicks: 35, pin_clicks: 25, impressions: 1080 },
  { date: "2024-01-09", cta_clicks: 43, pin_clicks: 30, impressions: 1200 },
];

// Mock data das campanhas
const mockCampaigns = [
  {
    id: "1",
    name: "Campanha Black Friday",
    description: "Promoção especial para Black Friday",
    status: "active",
    start_date: "2024-01-15",
    end_date: "2024-02-15",
    created_at: "2024-01-10",
    metrics: {
      cta_clicks: 245,
      pin_clicks: 189,
      total_7d: 67,
      impressions: 8460
    },
    tags: [
      {
        id: "1",
        type: "cta" as const,
        title: "Botão Principal",
        code: "bf2024_cta_x9k2m",
        created_at: "2024-01-10"
      },
      {
        id: "2",
        type: "pin" as const,
        title: "Pin Localização",
        code: "bf2024_pin_h7n4j",
        created_at: "2024-01-10"
      }
    ] as Tag[]
  },
  {
    id: "2", 
    name: "Campanha Natal",
    description: "Campanha para período natalino",
    status: "paused",
    start_date: "2024-12-01",
    end_date: "2024-12-31",
    created_at: "2024-11-20",
    metrics: {
      cta_clicks: 156,
      pin_clicks: 98,
      total_7d: 23,
      impressions: 3420
    },
    tags: [
      {
        id: "3",
        type: "cta" as const,
        title: "Banner Natalino",
        code: "natal24_cta_k8j5l",
        created_at: "2024-11-20"
      }
    ] as Tag[]
  }
];

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};

const calculateCTR = (clicks: number, impressions: number) => {
  return impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : "0.00";
};

const generateTag = (campaignName: string, title: string, type: string): string => {
  const cleanCampaign = campaignName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
  const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
  const random = Math.random().toString(36).slice(2, 5);
  return `${cleanCampaign}-${cleanTitle}-${type}-${random}`;
};

const CampaignDetails = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [dailyMetrics] = useState(mockDailyMetrics);
  
  // Encontrar a campanha pelo ID e configurar estado das tags
  const campaignData = mockCampaigns.find(c => c.id === id);
  const [campaign, setCampaign] = useState(campaignData);
  
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
    `https://seu-project-id.functions.supabase.co/track-event?tag=${tag}&cb=` + "${timestamp}";

  const getJsSnippet = (tag: string) => 
    `fetch("https://seu-project-id.functions.supabase.co/track-event", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  mode: "no-cors",
  body: JSON.stringify({
    tag: "${tag}",
    metadata: { ua: navigator.userAgent }
  })
})`;

  const addTag = (title: string, type: 'cta' | 'pin') => {
    const newTag: Tag = {
      id: Date.now().toString(),
      type,
      title,
      code: generateTag(campaign.name, title, type),
      created_at: new Date().toISOString()
    };
    
    setCampaign(prev => ({
      ...prev!,
      tags: [...prev!.tags, newTag]
    }));
    
    toast({
      title: "Tag criada!",
      description: `Tag "${title}" (${type.toUpperCase()}) foi adicionada com sucesso.`,
    });
  };

  // Cálculos de métricas
  const totalClicks = campaign.metrics.cta_clicks + campaign.metrics.pin_clicks;
  const ctaCTR = calculateCTR(campaign.metrics.cta_clicks, campaign.metrics.impressions);
  const pinCTR = calculateCTR(campaign.metrics.pin_clicks, campaign.metrics.impressions);
  const overallCTR = calculateCTR(totalClicks, campaign.metrics.impressions);

  const exportToCSV = () => {
    const headers = ['Data', 'CTA Clicks', 'PIN Clicks', 'Impressões', 'CTR CTA (%)', 'CTR PIN (%)'];
    const csvContent = [
      headers.join(','),
      ...dailyMetrics.map(row => [
        formatDate(row.date),
        row.cta_clicks,
        row.pin_clicks,
        row.impressions,
        calculateCTR(row.cta_clicks, row.impressions),
        calculateCTR(row.pin_clicks, row.impressions)
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
                  <div className="text-sm text-neutral-600">CTA Clicks</div>
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
                  <div className="text-2xl font-semibold">{campaign.metrics.impressions?.toLocaleString()}</div>
                  <div className="text-sm text-neutral-600">Impressões</div>
                  <div className="text-xs text-muted-foreground">Últimos 7 dias</div>
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
                          className={tag.type === 'cta' ? 
                            "bg-blue-50 text-blue-700 border-blue-200" : 
                            "bg-green-50 text-green-700 border-green-200"
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
                      <div className="text-xs text-muted-foreground">
                        Criada em {formatDate(tag.created_at)}
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
                  Entrega por dia e performance detalhada
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                Últimos {dailyMetrics.length} dias
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Data</TableHead>
                    <TableHead className="text-right">CTA Clicks</TableHead>
                    <TableHead className="text-right">PIN Clicks</TableHead>
                    <TableHead className="text-right">Impressões</TableHead>
                    <TableHead className="text-right">CTR CTA</TableHead>
                    <TableHead className="text-right">CTR PIN</TableHead>
                    <TableHead className="text-right">CTR Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyMetrics.map((day, index) => {
                    const totalDayClicks = day.cta_clicks + day.pin_clicks;
                    const dayCtaCTR = calculateCTR(day.cta_clicks, day.impressions);
                    const dayPinCTR = calculateCTR(day.pin_clicks, day.impressions);
                    const dayTotalCTR = calculateCTR(totalDayClicks, day.impressions);
                    
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
                          {day.impressions.toLocaleString()}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CampaignDetails;