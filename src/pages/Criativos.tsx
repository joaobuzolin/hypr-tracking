import { useState, useMemo, useCallback } from "react";
import { UserMenu } from "@/components/UserMenu";
import { CampaignCard } from "@/components/CampaignCard";
import { MetricsCard } from "@/components/MetricsCard";
import { Breadcrumb, useBreadcrumbs } from "@/components/Breadcrumb";
import { useCampaigns, type CampaignWithTags } from "@/hooks/useCampaigns";
import { useInsertionOrders } from "@/hooks/useInsertionOrders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, BarChart3, MousePointer, FileText, Search, CalendarIcon, Filter, User, Activity, Building, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

// Componentes otimizados agora estão em arquivos separados

// Common IAB standard formats
const IAB_FORMATS = [
  { value: '300x250', label: '300x250 - Medium Rectangle' },
  { value: '300x600', label: '300x600 - Half Page' },
  { value: '970x250', label: '970x250 - Billboard' },
  { value: '728x90', label: '728x90 - Leaderboard' },
  { value: '320x50', label: '320x50 - Mobile Banner' },
  { value: '160x600', label: '160x600 - Wide Skyscraper' },
  { value: '970x90', label: '970x90 - Super Leaderboard' },
  { value: '300x50', label: '300x50 - Mobile Banner Large' },
  { value: '320x100', label: '320x100 - Large Mobile Banner' },
  { value: '336x280', label: '336x280 - Large Rectangle' }
];

const CreateCriativoDialog = ({ 
  onCriativoCreated,
  insertionOrderId,
  campaignGroupId,
  createCampaign
}: { 
  onCriativoCreated: () => void;
  insertionOrderId?: string;
  campaignGroupId?: string;
  createCampaign: (data: any) => Promise<any>;
}) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iabFormat, setIabFormat] = useState("300x250");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);

    const { error } = await createCampaign({
      name: name.trim(),
      description: description.trim(),
      insertion_order_id: insertionOrderId,
      campaign_group_id: campaignGroupId,
      creative_format: iabFormat
    });

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar o criativo.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Criativo criado!",
        description: "Acesse os detalhes do criativo para adicionar tags de tracking.",
      });
      
      // Reset form
      setName("");
      setDescription("");
      setIabFormat("300x250");
      setOpen(false);
      onCriativoCreated();
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Criativo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Criativo</DialogTitle>
          <DialogDescription>
            Crie um novo criativo. Você poderá adicionar tags de tracking após a criação.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Criativo *</Label>
            <Input
              id="name"
              placeholder="Ex: Banner Black Friday 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descrição opcional do criativo"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="iab-format">Formato IAB *</Label>
            <Select value={iabFormat} onValueChange={setIabFormat} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o formato IAB" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-md">
                {IAB_FORMATS.map((format) => (
                  <SelectItem key={format.value} value={format.value}>
                    {format.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1" disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Criativo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const Criativos = () => {
  const { campaigns, loading, createCampaign } = useCampaigns();
  const { insertionOrders } = useInsertionOrders();
  const { insertionOrderId, campaignGroupId } = useParams();
  const { generateBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [creatorFilter, setCreatorFilter] = useState<string>("all");
  const [creationMonthFilter, setCreationMonthFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [insertionOrderFilter, setInsertionOrderFilter] = useState<string>("all");
  
  // Get current campaign group if we're in that context
  const currentCampaignGroup = useMemo(() => {
    // We'll need to fetch campaign group info when we have the ID
    // For now, return null as we don't have the campaign groups hook here
    return null;
  }, [campaignGroupId]);

  // Filter campaigns by campaign group if specified in URL
  const relevantCampaigns = useMemo(() => {
    if (!campaignGroupId) return campaigns;
    return campaigns.filter(campaign => campaign.campaign_group_id === campaignGroupId);
  }, [campaigns, campaignGroupId]);

  // Get unique insertion orders for filter
  const uniqueInsertionOrders = useMemo(() => {
    const ioIds = campaigns
      .map(c => c.insertion_order_id)
      .filter(Boolean)
      .filter((id, index, arr) => arr.indexOf(id) === index);
    
    return ioIds.map(id => {
      const io = insertionOrders.find(io => io.id === id);
      return io ? { id, name: io.client_name } : null;
    }).filter(Boolean) as { id: string; name: string }[];
  }, [campaigns, insertionOrders]);

  // Get unique creators and months for filter options
  const uniqueCreators = useMemo(() => {
    const creators = relevantCampaigns
      .filter(c => c.profile?.email)
      .map(c => c.profile!.email)
      .filter((email, index, arr) => arr.indexOf(email) === index);
    return creators.sort();
  }, [relevantCampaigns]);

  const uniqueMonths = useMemo(() => {
    const months = relevantCampaigns
      .map(c => {
        const date = new Date(c.created_at);
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      })
      .filter((month, index, arr) => arr.indexOf(month) === index);
    return months.sort().reverse();
  }, [relevantCampaigns]);

  // Filtered campaigns based on all filters
  const filteredCampaigns = useMemo(() => {
    let campaignsToFilter = insertionOrderId ? relevantCampaigns : campaigns;
    
    return campaignsToFilter.filter(campaign => {
      // Search filter
      const matchesSearch = 
        campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (campaign.description && campaign.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Date range filter
      const campaignDate = new Date(campaign.created_at);
      const matchesDateRange = 
        (!dateRange?.from || campaignDate >= dateRange.from) &&
        (!dateRange?.to || campaignDate <= dateRange.to);
      
      // Creator filter
      const matchesCreator = 
        creatorFilter === "all" || 
        campaign.profile?.email === creatorFilter;
      
      // Creation month filter
      const campaignMonth = `${campaignDate.getFullYear()}-${(campaignDate.getMonth() + 1).toString().padStart(2, '0')}`;
      const matchesCreationMonth = 
        creationMonthFilter === "all" || 
        campaignMonth === creationMonthFilter;
      
      // Status filter
      const matchesStatus = 
        statusFilter === "all" || 
        campaign.derivedStatus === statusFilter;
      
      // Insertion Order filter (only when not in IO context)
      const matchesInsertionOrder = 
        insertionOrderId || // Skip filter if we're already in IO context
        insertionOrderFilter === "all" || 
        campaign.insertion_order_id === insertionOrderFilter;
      
      return matchesSearch && matchesDateRange && matchesCreator && matchesCreationMonth && matchesStatus && matchesInsertionOrder;
    });
  }, [campaigns, relevantCampaigns, searchTerm, dateRange, creatorFilter, creationMonthFilter, statusFilter, insertionOrderFilter, insertionOrderId]);
  
  const totalCampaigns = filteredCampaigns.length;
  const activeCampaigns = filteredCampaigns.filter(c => c.derivedStatus === 'active').length;
  const totalClicks = filteredCampaigns.reduce((sum, c) => sum + c.metrics.cta_clicks + c.metrics.pin_clicks, 0);

  const clearFilters = () => {
    setSearchTerm("");
    setDateRange(undefined);
    setCreatorFilter("all");
    setCreationMonthFilter("all");
    setStatusFilter("all");
    setInsertionOrderFilter("all");
  };

  const handleCriativoCreated = useCallback(() => {
    // Campaigns will be refreshed automatically by the hook
  }, []);

  // Generate breadcrumbs based on current context
  const breadcrumbItems = generateBreadcrumbs();

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
      {/* Fixed Liquid Glass Header */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-white/50 border-b border-white/20 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="mb-1">
                <img 
                  src="/lovable-uploads/0fcddc38-83cc-4638-b362-1485d244ceb3.png" 
                  alt="HYPR TRACKING" 
                  className="h-7 object-contain"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Gerencie seus criativos e acompanhe métricas de tracking
              </p>
            </div>
            <div className="flex gap-3">
              <Link to="/reports">
                <Button variant="outline" className="gap-2">
                  <FileText className="w-4 h-4" />
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
          <div className="flex justify-end gap-3 mb-6">
            <CreateCriativoDialog 
              onCriativoCreated={handleCriativoCreated} 
              insertionOrderId={insertionOrderId}
              campaignGroupId={campaignGroupId}
              createCampaign={createCampaign}
            />
          </div>

          {/* Header with Campaign Group context */}
          {currentCampaignGroup && (
            <div className="mb-6 p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold">{currentCampaignGroup.name}</h2>
              </div>
              {currentCampaignGroup.description && (
                <p className="text-sm text-muted-foreground">{currentCampaignGroup.description}</p>
              )}
            </div>
          )}

          {/* Stats Overview simples */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border shadow-sm">
                  <CardContent className="p-4">
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <MetricsCard
                  icon={BarChart3}
                  value={totalCampaigns}
                  label="Total de Criativos"
                />
                
                <MetricsCard
                  icon={BarChart3}
                  value={activeCampaigns}
                  label="Criativos Ativos"
                  className="bg-green-50"
                  iconColor="text-green-600"
                />
                
                <MetricsCard
                  icon={MousePointer}
                  value={totalClicks}
                  label="Total de Clicks"
                  className="bg-blue-50"
                  iconColor="text-blue-600"
                />
              </>
            )}
          </div>

          {/* Filters Section */}
          <div className="p-4 bg-muted/50 rounded-lg border mb-6">
            <div className="space-y-4">
              {/* First row: Search and Date Range */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar criativos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <DateRangePicker />
              </div>
              
              {/* Second row: Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                {!insertionOrderId && (
                  <Select value={insertionOrderFilter} onValueChange={setInsertionOrderFilter}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <Building className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Insertion Order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as IOs</SelectItem>
                      {uniqueInsertionOrders.map((io) => (
                        <SelectItem key={io.id} value={io.id}>
                          {io.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Select value={creatorFilter} onValueChange={setCreatorFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <User className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os criadores</SelectItem>
                    {uniqueCreators.map((creator) => (
                      <SelectItem key={creator} value={creator}>
                        {creator}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={creationMonthFilter} onValueChange={setCreationMonthFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Mês/Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os períodos</SelectItem>
                    {uniqueMonths.map((month) => {
                      const [year, monthNum] = month.split('-');
                      const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('pt-BR', { 
                        month: 'long', 
                        year: 'numeric' 
                      });
                      return (
                        <SelectItem key={month} value={month}>
                          {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <Activity className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="active">Ativas</SelectItem>
                    <SelectItem value="paused">Pausadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Results and clear filters */}
              {(searchTerm || dateRange?.from || dateRange?.to || creatorFilter !== "all" || creationMonthFilter !== "all" || statusFilter !== "all" || insertionOrderFilter !== "all") && (
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
              <h2 className="text-lg font-medium">
                Seus Criativos {currentCampaignGroup ? `- ${currentCampaignGroup.name}` : ''}
              </h2>
              <Badge variant="outline" className="text-xs">
                {filteredCampaigns.length} criativo{filteredCampaigns.length !== 1 ? 's' : ''}
                {filteredCampaigns.length !== relevantCampaigns.length && (
                  <span className="text-muted-foreground ml-1">de {relevantCampaigns.length}</span>
                )}
              </Badge>
            </div>

            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Card key={i} className="border shadow-sm">
                    <CardContent className="p-6">
                      <Skeleton className="h-32 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <Card className="border shadow-sm">
                <CardContent className="p-8 text-center">
                  <div className="text-muted-foreground mb-4">
                    {searchTerm || dateRange?.from || dateRange?.to || creatorFilter !== "all" || creationMonthFilter !== "all" || statusFilter !== "all" ? (
                      <>
                        <Filter className="w-12 h-12 mx-auto mb-2 opacity-40" />
                        <p>Nenhum criativo encontrado com os filtros aplicados</p>
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
                        <p className="mb-4">Nenhum criativo criado ainda</p>
                        <CreateCriativoDialog 
                          onCriativoCreated={handleCriativoCreated} 
                          insertionOrderId={insertionOrderId}
                          campaignGroupId={campaignGroupId}
                          createCampaign={createCampaign}
                        />
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
    </div>
  );
};

export default Criativos;