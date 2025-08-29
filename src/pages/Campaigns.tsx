import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Copy, BarChart3, MousePointer, FileText, Search, CalendarIcon, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

// Types
interface Tag {
  id: string;
  type: 'click-button' | 'pin' | 'page-view';
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
      page_views: 8460,
      total_7d: 67
    },
    tags: [
      {
        id: "1",
        type: "click-button" as const,
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
      page_views: 3420,
      total_7d: 23
    },
    tags: [
      {
        id: "3",
        type: "click-button" as const,
        title: "Banner Natalino",
        code: "natal24_cta_k8j5l",
        created_at: "2024-11-20"
      }
    ] as Tag[]
  }
];

const calculateCTR = (clicks: number, pageViews: number) => {
  return pageViews > 0 ? ((clicks / pageViews) * 100).toFixed(2) : "0.00";
};
const generateTag = (campaignName: string, title: string, type: string): string => {
  const cleanCampaign = campaignName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
  const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
  const random = Math.random().toString(36).slice(2, 5);
  return `${cleanCampaign}-${cleanTitle}-${type}-${random}`;
};

const CampaignCard = ({ campaign }: { campaign: any }) => {
  const { toast } = useToast();
  
  // Calculate CTR based on total clicks vs page views
  const totalClicks = campaign.metrics.cta_clicks + campaign.metrics.pin_clicks;
  const ctr = calculateCTR(totalClicks, campaign.metrics.page_views);
  
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
                <div className="text-xs text-neutral-600">Click Button</div>
              </div>
              <div className="text-center p-3 bg-neutral-50 rounded border">
                <div className="text-lg font-semibold">{campaign.metrics.pin_clicks}</div>
                <div className="text-xs text-neutral-600">PIN Clicks</div>
              </div>
              <div className="text-center p-3 bg-neutral-50 rounded border">
                <div className="text-lg font-semibold">{ctr}%</div>
                <div className="text-xs text-neutral-600">CTR</div>
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
        page_views: 0,
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
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  
  // Filtered campaigns based on search and date range
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      // Search filter
      const matchesSearch = 
        campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Date range filter
      const campaignDate = new Date(campaign.created_at);
      const matchesDateRange = 
        (!dateRange?.from || campaignDate >= dateRange.from) &&
        (!dateRange?.to || campaignDate <= dateRange.to);
      
      return matchesSearch && matchesDateRange;
    });
  }, [campaigns, searchTerm, dateRange]);
  
  const totalCampaigns = filteredCampaigns.length;
  const activeCampaigns = filteredCampaigns.filter(c => c.status === 'active').length;
  const totalClicks = filteredCampaigns.reduce((sum, c) => sum + c.metrics.cta_clicks + c.metrics.pin_clicks, 0);

  const clearFilters = () => {
    setSearchTerm("");
    setDateRange(undefined);
  };

  const handleCampaignCreated = (newCampaign: any) => {
    setCampaigns(prev => [...prev, newCampaign]);
  };

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

        {/* Filters Section */}
        <div className="p-4 bg-muted/50 rounded-lg border mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar campanhas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <DateRangePicker />
            </div>
            
            {(searchTerm || dateRange?.from || dateRange?.to) && (
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
        </div>

        {/* Campaigns List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium">Suas Campanhas</h2>
              <Badge variant="outline" className="text-xs">
                {filteredCampaigns.length} campanha{filteredCampaigns.length !== 1 ? 's' : ''}
                {filteredCampaigns.length !== campaigns.length && (
                  <span className="text-muted-foreground ml-1">de {campaigns.length}</span>
                )}
              </Badge>
            </div>

            {filteredCampaigns.length === 0 ? (
              <Card className="border shadow-sm">
                <CardContent className="p-8 text-center">
                  <div className="text-muted-foreground mb-4">
                    {searchTerm || dateRange?.from || dateRange?.to ? (
                      <>
                        <Filter className="w-12 h-12 mx-auto mb-2 opacity-40" />
                        <p>Nenhuma campanha encontrada com os filtros aplicados</p>
                        <Button 
                          variant="link" 
                          onClick={clearFilters}
                          className="text-sm mt-2"
                        >
                          Limpar filtros
                        </Button>
                      </>
                    ) : (
                      <>
                        <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-40" />
                        <p>Nenhuma campanha criada ainda</p>
                        <CreateCampaignDialog onCampaignCreated={handleCampaignCreated} />
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredCampaigns.map((campaign) => (
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