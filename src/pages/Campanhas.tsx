import { useState, useMemo, useEffect } from "react";
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
import { BarChart3, Users, MousePointer, Search, Filter, Calendar, Building, ChevronLeft, ChevronRight } from "lucide-react";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem } from "@/components/ui/pagination";
import { useParams, useNavigate } from "react-router-dom";

import React from "react";

const Campanhas = () => {
  const { campaignGroups, loading } = useCampaignGroups();
  const { insertionOrders } = useInsertionOrders();
  const { insertionOrderId } = useParams();
  const navigate = useNavigate();
  const { generateBreadcrumbs } = useBreadcrumbs();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
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
  
  // Pagination logic
  const totalPages = Math.ceil(filteredCampaignGroups.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCampaignGroups = filteredCampaignGroups.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);
  
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

        {/* Stats Overview - optimized grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="border shadow-sm">
                  <CardContent className="p-3 md:p-4">
                    <Skeleton className="h-12 md:h-16 w-full" />
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
                  className="bg-green-50 dark:bg-green-950"
                  iconColor="text-green-600 dark:text-green-400"
                />
                
                <MetricsCard
                  icon={BarChart3}
                  value={totalCriativos}
                  label="Total de Criativos"
                  className="bg-blue-50 dark:bg-blue-950"
                  iconColor="text-blue-600 dark:text-blue-400"
                />
                
                <MetricsCard
                  icon={MousePointer}
                  value={totalClicks}
                  label="Total de Clicks"
                  className="bg-purple-50 dark:bg-purple-950"
                  iconColor="text-purple-600 dark:text-purple-400"
                />
              </>
            )}
          </section>

        {/* Filters Section - optimized */}
        <section className="p-3 md:p-4 section-surface rounded-lg border mb-4 md:mb-6">
            <div className="space-y-3 md:space-y-4">
              {/* Search and Filters - improved responsive layout */}
              <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar campanhas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-9 md:h-10"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[150px] h-9 md:h-10">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-md">
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="active">Ativas</SelectItem>
                    <SelectItem value="paused">Pausadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Results and clear filters - optimized spacing */}
              {(searchTerm || statusFilter !== "all") && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {filteredCampaignGroups.length} resultado{filteredCampaignGroups.length !== 1 ? 's' : ''}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs h-7 md:h-8"
                  >
                    Limpar filtros
                  </Button>
                </div>
              )}
            </div>
          </section>

        {/* Campaign Groups List - optimized spacing */}
        <section className="space-y-3 md:space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <h2 className="text-base md:text-lg font-medium">
                Suas Campanhas {currentInsertionOrder ? `- ${currentInsertionOrder.client_name}` : ''}
              </h2>
              <Badge variant="outline" className="text-xs w-fit">
                {filteredCampaignGroups.length} campanha{filteredCampaignGroups.length !== 1 ? 's' : ''}
                {filteredCampaignGroups.length !== relevantCampaignGroups.length && (
                  <span className="text-muted-foreground ml-1">de {relevantCampaignGroups.length}</span>
                )}
              </Badge>
            </div>

            {loading ? (
              <div className="space-y-3 md:space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="border shadow-sm">
                    <CardContent className="p-4 md:p-6">
                      <Skeleton className="h-24 md:h-32 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredCampaignGroups.length === 0 ? (
              <Card className="border shadow-sm">
                <CardContent className="p-6 md:p-8 text-center">
                  <div className="text-muted-foreground mb-4">
                    {searchTerm || statusFilter !== "all" ? (
                      <>
                        <Filter className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 opacity-40" />
                        <p className="text-sm md:text-base">Nenhuma campanha encontrada com os filtros aplicados</p>
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
                        <Users className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 opacity-40" />
                        <p className="mb-4 text-sm md:text-base">Nenhuma campanha criada ainda</p>
                        <CreateCampaignGroupDialog insertionOrderId={insertionOrderId} />
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-3 md:gap-4">
                  {paginatedCampaignGroups.map((group) => (
                    <CampaignGroupCard key={group.id} campaignGroup={group} />
                  ))}
                </div>
                
                {totalPages > 1 && (
                  <Pagination className="mt-6">
                    <PaginationContent>
                      <PaginationItem>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Anterior
                        </Button>
                      </PaginationItem>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                        .map((page, index, array) => (
                          <React.Fragment key={page}>
                            {index > 0 && array[index - 1] !== page - 1 && (
                              <PaginationItem>
                                <PaginationEllipsis />
                              </PaginationItem>
                            )}
                            <PaginationItem>
                              <Button
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                              >
                                {page}
                              </Button>
                            </PaginationItem>
                          </React.Fragment>
                        ))}
                      
                      <PaginationItem>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Próxima
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            )}
        </section>
    </AppLayout>
  );
};

export default Campanhas;