import { useState, useMemo, useCallback, useDeferredValue } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { CampaignCard } from "@/components/CampaignCard";
import { MetricsCard } from "@/components/MetricsCard";
import { useBreadcrumbs } from "@/components/Breadcrumb";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useCampaignGroups } from "@/hooks/useCampaignGroups";
import { useInsertionOrders } from "@/hooks/useInsertionOrders";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, BarChart3, MousePointer, Search, CalendarIcon, Filter, User, Activity, Building, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useParams, useNavigate } from "react-router-dom";
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
  createCampaign,
  campaignGroups = [],
  insertionOrders = []
}: { 
  onCriativoCreated: () => void;
  insertionOrderId?: string;
  campaignGroupId?: string;
  createCampaign: (data: any) => Promise<any>;
  campaignGroups?: any[];
  insertionOrders?: any[];
}) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iabFormat, setIabFormat] = useState("300x250");
  const [selectedCampaignGroupId, setSelectedCampaignGroupId] = useState(campaignGroupId || "");
  const [selectedInsertionOrderId, setSelectedInsertionOrderId] = useState(insertionOrderId || "");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);

    const { error } = await createCampaign({
      name: name.trim(),
      description: description.trim(),
      insertion_order_id: selectedInsertionOrderId || insertionOrderId,
      campaign_group_id: selectedCampaignGroupId || campaignGroupId,
      creative_format: iabFormat
    });

    if (error) {
      toast({
        title: "Erro",
        description: typeof error === 'string' ? error : "Não foi possível criar o criativo.",
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
      setSelectedCampaignGroupId(campaignGroupId || "");
      setSelectedInsertionOrderId(insertionOrderId || "");
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
          {/* Campaign Group Selection - Only show if not in context */}
          {!campaignGroupId && (
            <div className="space-y-2">
              <Label htmlFor="campaign-group">Grupo de Campanha *</Label>
              <Select value={selectedCampaignGroupId} onValueChange={setSelectedCampaignGroupId} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o grupo de campanha" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-md">
                  {campaignGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Insertion Order Selection - Only show if not in context */}
          {!insertionOrderId && (
            <div className="space-y-2">
              <Label htmlFor="insertion-order">Insertion Order</Label>
              <Select value={selectedInsertionOrderId} onValueChange={setSelectedInsertionOrderId} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o insertion order (opcional)" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-md">
                  {insertionOrders.map((io) => (
                    <SelectItem key={io.id} value={io.id}>
                      {io.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={loading || (!campaignGroupId && !selectedCampaignGroupId)}
            >
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
  const { campaignGroups } = useCampaignGroups();
  const { insertionOrderId, campaignGroupId } = useParams();
  const { generateBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [creatorFilter, setCreatorFilter] = useState<string>("all");
  const [creationMonthFilter, setCreationMonthFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [insertionOrderFilter, setInsertionOrderFilter] = useState<string>("all");
  
  // Get current campaign group if we're in that context
  const currentCampaignGroup = useMemo(() => {
    if (!campaignGroupId) return null;
    return campaignGroups.find(cg => cg.id === campaignGroupId);
  }, [campaignGroupId, campaignGroups]);

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
    let campaignsToFilter = (insertionOrderId || campaignGroupId) ? relevantCampaigns : campaigns;
    
    return campaignsToFilter.filter(campaign => {
      // Search filter
      const matchesSearch = 
        campaign.name.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
        (campaign.description && campaign.description.toLowerCase().includes(deferredSearchTerm.toLowerCase()));
      
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
  }, [campaigns, relevantCampaigns, deferredSearchTerm, dateRange, creatorFilter, creationMonthFilter, statusFilter, insertionOrderFilter, insertionOrderId]);
  
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

  // Create context bar for campaign group selector
  const contextBar = currentCampaignGroup ? (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{currentCampaignGroup.name}</h2>
        </div>
        {currentCampaignGroup.description && (
          <p className="text-sm text-muted-foreground">{currentCampaignGroup.description}</p>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium">Trocar campanha:</Label>
        <Select 
          value={campaignGroupId || ""} 
          onValueChange={(value) => {
            if (value === "all") {
              navigate("/criativos");
            } else {
              navigate(`/campanhas/${value}/criativos`);
            }
          }}
        >
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Selecione uma campanha" />
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-md z-50">
            <SelectItem value="all">Todas as campanhas</SelectItem>
            {campaignGroups
              .filter(cg => !insertionOrderId || cg.insertion_order_id === insertionOrderId)
              .map((cg) => (
                <SelectItem key={cg.id} value={cg.id}>
                  {cg.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  ) : null;

  // Actions for the layout
  const actions = (
    <CreateCriativoDialog 
      onCriativoCreated={handleCriativoCreated} 
      insertionOrderId={insertionOrderId}
      campaignGroupId={campaignGroupId}
      createCampaign={createCampaign}
      campaignGroups={campaignGroups}
      insertionOrders={insertionOrders}
    />
  );

  return (
    <AppLayout
      subtitle="Gerencie seus criativos e acompanhe métricas de tracking"
      breadcrumbs={breadcrumbItems}
      actions={actions}
      contextBar={contextBar}
    >
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
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
              className="bg-success/5 border-success/20"
              iconColor="text-success"
            />
            
            <MetricsCard
              icon={MousePointer}
              value={totalClicks}
              label="Total de Clicks"
              className="bg-primary/5 border-primary/20"
              iconColor="text-primary"
            />
          </>
        )}
      </div>

      {/* Filters Section */}
      <Card className="mb-6 md:mb-8 mx-1">
        <CardContent className="p-4 md:p-6">
          <div className="space-y-4">
            {/* First row: Search and Date Range */}
            <div className="flex flex-col gap-3 md:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar criativos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
              <div className="w-full">
                <DateRangePicker />
              </div>
            </div>
            
            {/* Second row: Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              {!insertionOrderId && !campaignGroupId && (
                <Select value={insertionOrderFilter} onValueChange={setInsertionOrderFilter}>
                  <SelectTrigger className="w-full">
                    <Building className="w-4 h-4 mr-2 shrink-0" />
                    <SelectValue placeholder="Insertion Order" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-md z-50">
                    <SelectItem value="all">Todas as IOs</SelectItem>
                    {uniqueInsertionOrders.map((io) => (
                      <SelectItem key={io.id} value={io.id}>
                        <span className="truncate">{io.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={creatorFilter} onValueChange={setCreatorFilter}>
                <SelectTrigger className="w-full">
                  <User className="w-4 h-4 mr-2 shrink-0" />
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-md z-50">
                  <SelectItem value="all">Todos os criadores</SelectItem>
                  {uniqueCreators.map((creator) => (
                    <SelectItem key={creator} value={creator}>
                      <span className="truncate">{creator}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={creationMonthFilter} onValueChange={setCreationMonthFilter}>
                <SelectTrigger className="w-full">
                  <CalendarIcon className="w-4 h-4 mr-2 shrink-0" />
                  <SelectValue placeholder="Mês/Ano" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-md z-50">
                  <SelectItem value="all">Todos os períodos</SelectItem>
                  {uniqueMonths.map((month) => {
                    const [year, monthNum] = month.split('-');
                    const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('pt-BR', { 
                      month: 'long', 
                      year: 'numeric' 
                    });
                    return (
                      <SelectItem key={month} value={month}>
                        <span className="truncate">{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</span>
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
                <SelectContent className="bg-background border shadow-md z-50">
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
        </CardContent>
      </Card>

      {/* Campaigns List */}
      <div className="space-y-6 px-1">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-lg md:text-xl font-semibold">
            Seus Criativos {currentCampaignGroup ? `- ${currentCampaignGroup.name}` : ''}
          </h2>
          <Badge variant="outline" className="shrink-0">
            {filteredCampaigns.length} criativo{filteredCampaigns.length !== 1 ? 's' : ''}
            {filteredCampaigns.length !== relevantCampaigns.length && (
              <span className="text-muted-foreground ml-1">de {relevantCampaigns.length}</span>
            )}
          </Badge>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 md:p-6">
                  <Skeleton className="h-24 md:h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <Card>
            <CardContent className="p-8 md:p-12 text-center">
              <div className="text-muted-foreground">
                {searchTerm || dateRange?.from || dateRange?.to || creatorFilter !== "all" || creationMonthFilter !== "all" || statusFilter !== "all" ? (
                  <>
                    <Filter className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 opacity-40" />
                    <p className="mb-4 text-sm md:text-base">Nenhum criativo encontrado com os filtros aplicados</p>
                    <Button 
                      variant="outline" 
                      onClick={clearFilters}
                      size="sm"
                    >
                      Limpar filtros
                    </Button>
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 opacity-40" />
                    <p className="mb-4 text-sm md:text-base">Nenhum criativo criado ainda</p>
                    <CreateCriativoDialog 
                      onCriativoCreated={handleCriativoCreated} 
                      insertionOrderId={insertionOrderId}
                      campaignGroupId={campaignGroupId}
                      createCampaign={createCampaign}
                      campaignGroups={campaignGroups}
                      insertionOrders={insertionOrders}
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
    </AppLayout>
  );
};

export default Criativos;