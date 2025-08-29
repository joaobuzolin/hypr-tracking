import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Copy, BarChart3, MousePointer, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

// Types
interface Tag {
  id: string;
  type: 'cta' | 'pin';
  title: string;
  code: string;
  created_at: string;
}

// Mock data - será substituído por queries do Supabase
const initialCampaigns = [
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
      total_7d: 67
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
      total_7d: 23
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

const generateTag = (campaignName: string, title: string, type: string): string => {
  const cleanCampaign = campaignName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
  const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
  const random = Math.random().toString(36).slice(2, 5);
  return `${cleanCampaign}-${cleanTitle}-${type}-${random}`;
};

const CampaignCard = ({ campaign }: { campaign: any }) => {
  const { toast } = useToast();
  
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

  return (
    <Link to={`/campaigns/${campaign.id}`} className="block">
      <Card className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg font-semibold hover:text-blue-600 transition-colors">
                {campaign.name}
              </CardTitle>
              <CardDescription className="text-sm">{campaign.description}</CardDescription>
            </div>
            <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'} className="text-xs">
              {campaign.status === 'active' ? 'Ativa' : 'Pausada'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0" onClick={(e) => e.preventDefault()}>
          <div className="space-y-4">
            {/* Métricas simples */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-neutral-50 rounded border">
                <div className="text-lg font-semibold">{campaign.metrics.cta_clicks}</div>
                <div className="text-xs text-neutral-600">CTA Clicks</div>
              </div>
              <div className="text-center p-3 bg-neutral-50 rounded border">
                <div className="text-lg font-semibold">{campaign.metrics.pin_clicks}</div>
                <div className="text-xs text-neutral-600">PIN Clicks</div>
              </div>
              <div className="text-center p-3 bg-neutral-50 rounded border">
                <div className="text-lg font-semibold">{campaign.metrics.total_7d}</div>
                <div className="text-xs text-neutral-600">Últimos 7d</div>
              </div>
            </div>

            <Separator />

            {/* Tags Preview */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Tags de Tracking</h4>
              
              {campaign.tags.length === 0 ? (
                <div className="text-xs text-muted-foreground p-3 bg-neutral-50 rounded border text-center">
                  Nenhuma tag criada. Clique na campanha para adicionar tags.
                </div>
              ) : (
                <div className="space-y-2">
                  {campaign.tags.slice(0, 2).map((tag) => (
                    <div key={tag.id} className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {tag.type.toUpperCase()}
                      </Badge>
                      <span className="text-xs font-medium">{tag.title}</span>
                      <code className="text-xs bg-neutral-100 px-2 py-1 rounded font-mono">
                        {tag.code}
                      </code>
                    </div>
                  ))}
                  {campaign.tags.length > 2 && (
                    <div className="text-xs text-muted-foreground">
                      +{campaign.tags.length - 2} tag{campaign.tags.length - 2 !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

const CreateCampaignDialog = ({ onCampaignCreated }: { onCampaignCreated: (campaign: any) => void }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Criar nova campanha sem tags automáticas
    const newCampaign = {
      id: Date.now().toString(),
      name: name,
      description: description,
      status: "active" as const,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString().split('T')[0],
      metrics: {
        cta_clicks: 0,
        pin_clicks: 0,
        total_7d: 0
      },
      tags: [] as Tag[]
    };
    
    toast({
      title: "Campanha criada!",
      description: "Acesse os detalhes da campanha para adicionar tags de tracking.",
    });
    
    // Reset form
    setName("");
    setDescription("");
    setOpen(false);
    onCampaignCreated(newCampaign);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Campanha
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Nova Campanha</DialogTitle>
          <DialogDescription>
            Crie uma nova campanha. Você poderá adicionar tags de tracking após a criação.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Campanha *</Label>
            <Input
              id="name"
              placeholder="Ex: Black Friday 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descrição opcional da campanha"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Criar Campanha
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const totalClicks = campaigns.reduce((sum, c) => sum + c.metrics.cta_clicks + c.metrics.pin_clicks, 0);

  const handleCampaignCreated = (newCampaign: any) => {
    setCampaigns(prev => [...prev, newCampaign]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header simples */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-1">
                Campanhas
              </h1>
              <p className="text-sm text-muted-foreground">
                Gerencie suas campanhas e acompanhe métricas de tracking
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="gap-2" disabled>
                <FileText className="w-4 h-4" />
                Relatórios (Em breve)
              </Button>
              <CreateCampaignDialog onCampaignCreated={handleCampaignCreated} />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Overview simples */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-neutral-100 rounded">
                  <BarChart3 className="w-5 h-5 text-neutral-600" />
                </div>
                <div>
                  <div className="text-xl font-semibold">{totalCampaigns}</div>
                  <div className="text-sm text-neutral-600">Total de Campanhas</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-xl font-semibold">{activeCampaigns}</div>
                  <div className="text-sm text-neutral-600">Campanhas Ativas</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded">
                  <MousePointer className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-xl font-semibold">{totalClicks}</div>
                  <div className="text-sm text-neutral-600">Total de Clicks</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium">Suas Campanhas</h2>
            <Badge variant="outline" className="text-xs">
              {campaigns.length} campanha{campaigns.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {campaigns.length === 0 ? (
            <Card className="border shadow-sm">
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground mb-4">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p>Nenhuma campanha criada ainda</p>
                </div>
                <CreateCampaignDialog onCampaignCreated={handleCampaignCreated} />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {campaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Campaigns;