import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { CampaignGroupCard } from "@/components/CampaignGroupCard";
import { MetricsCard } from "@/components/MetricsCard";
import { useBreadcrumbs } from "@/components/Breadcrumb";
import { useCampaignGroups } from "@/hooks/useCampaignGroups";
import { useInsertionOrders } from "@/hooks/useInsertionOrders";
import { CreateCampaignGroupDialog } from "@/components/CreateCampaignGroupDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Users, MousePointer, Search, Filter, Calendar, Building } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";

const Campanhas = () => {
  const { campaignGroups, loading } = useCampaignGroups();
  const { insertionOrders } = useInsertionOrders();
  const { insertionOrderId } = useParams();
  const navigate = useNavigate();
  const { generateBreadcrumbs } = useBreadcrumbs();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Get current insertion order if we're in that context
  const currentInsertionOrder = useMemo(() => {
    if (!insertionOrderId) return null;
    return insertionOrders.find(io => io.id === insertionOrderId);
  }, [insertionOrderId, insertionOrders]);

  // Filter campaign groups by insertion order if specified in URL
  const relevantCampaignGroups = useMemo(() => {
    if (!insertionOrderId) return campaignGroups;
    return campaignGroups.filter(group => group.insertion_order_id === insertionOrderId);
  }, [campaignGroups, insertionOrderId]);

  // Filtered campaign groups based on search and filters
  const filteredCampaignGroups = useMemo(() => {
    return relevantCampaignGroups.filter(group => {
      // Search filter
      const matchesSearch = 
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Status filter
      const matchesStatus = 
        statusFilter === "all" || 
        group.derivedStatus === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [relevantCampaignGroups, searchTerm, statusFilter]);
  
  const totalCampaignGroups = filteredCampaignGroups.length;
  const activeCampaignGroups = filteredCampaignGroups.filter(g => g.derivedStatus === 'active').length;
  const totalCriativos = filteredCampaignGroups.reduce((sum, g) => sum + (g.campaigns_count || 0), 0);
  const totalClicks = filteredCampaignGroups.reduce((sum, g) => sum + (g.total_clicks || 0), 0);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  // Generate breadcrumbs based on current context
  const breadcrumbItems = generateBreadcrumbs();

  const contextBar = currentInsertionOrder && (
    <div className="flex items-center gap-2">
      <Building className="w-4 h-4 text-muted-foreground" />
      <Select
        value={insertionOrderId}
        onValueChange={(value) => {
          if (value !== insertionOrderId) {
            // Reset local filters when switching
            setSearchTerm("");
            setStatusFilter("all");
            
            navigate(`/insertion-orders/${value}/campanhas`);
          }
        }}
      >
        <SelectTrigger className="w-auto border-none shadow-none p-0 h-auto text-lg font-semibold bg-transparent hover:bg-muted/50 focus:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="z-50 bg-background border shadow-md">
          {insertionOrders.map((io) => (
            <SelectItem key={io.id} value={io.id}>
              {io.client_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {currentInsertionOrder.description && (
        <p className="text-sm text-muted-foreground ml-2">{currentInsertionOrder.description}</p>
      )}
    </div>
  );

  return (
    <AppLayout 
      subtitle="Gerencie suas campanhas e organize seus criativos"
      breadcrumbs={breadcrumbItems}
      actions={<CreateCampaignGroupDialog insertionOrderId={insertionOrderId} />}
      contextBar={contextBar}
    >

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="border shadow-sm">
                  <CardContent className="p-4">
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <MetricsCard
                  icon={Users}
                  value={totalCampaignGroups}
                  label="Total de Campanhas"
                />
                
                <MetricsCard
                  icon={Users}
                  value={activeCampaignGroups}
                  label="Campanhas Ativas"
                  className="bg-muted"
                  iconColor="text-green-600"
                />
                
                <MetricsCard
                  icon={BarChart3}
                  value={totalCriativos}
                  label="Total de Criativos"
                  className="bg-muted"
                  iconColor="text-blue-600"
                />
                
                <MetricsCard
                  icon={MousePointer}
                  value={totalClicks}
                  label="Total de Clicks"
                  className="bg-muted"
                  iconColor="text-purple-600"
                />
              </>
            )}
          </div>

        {/* Filters Section */}
        <div className="p-4 bg-muted/30 rounded-lg border mb-6">
            <div className="space-y-4">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar campanhas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-md">
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="active">Ativas</SelectItem>
                    <SelectItem value="paused">Pausadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Results and clear filters */}
              {(searchTerm || statusFilter !== "all") && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {filteredCampaignGroups.length} resultado{filteredCampaignGroups.length !== 1 ? 's' : ''}
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

        {/* Campaign Groups List */}
        <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium">
                Suas Campanhas {currentInsertionOrder ? `- ${currentInsertionOrder.client_name}` : ''}
              </h2>
              <Badge variant="outline" className="text-xs">
                {filteredCampaignGroups.length} campanha{filteredCampaignGroups.length !== 1 ? 's' : ''}
                {filteredCampaignGroups.length !== relevantCampaignGroups.length && (
                  <span className="text-muted-foreground ml-1">de {relevantCampaignGroups.length}</span>
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
            ) : filteredCampaignGroups.length === 0 ? (
              <Card className="border shadow-sm">
                <CardContent className="p-8 text-center">
                  <div className="text-muted-foreground mb-4">
                    {searchTerm || statusFilter !== "all" ? (
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
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-40" />
                        <p className="mb-4">Nenhuma campanha criada ainda</p>
                        <CreateCampaignGroupDialog insertionOrderId={insertionOrderId} />
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredCampaignGroups.map((group) => (
                  <CampaignGroupCard key={group.id} campaignGroup={group} />
                ))}
              </div>
            )}
        </div>
    </AppLayout>
  );
};

export default Campanhas;