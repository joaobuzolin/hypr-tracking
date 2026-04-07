import { useState, useMemo, useCallback, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { InsertionOrderCard } from "@/components/InsertionOrderCard";
import { EditInsertionOrderDialog } from "@/components/EditInsertionOrderDialog";
import { MetricsCard } from "@/components/MetricsCard";
import { CreateInsertionOrderDialog } from "@/components/CreateInsertionOrderDialog";
import { PaginationControls } from "@/components/PaginationControls";
import { useBreadcrumbs } from "@/components/Breadcrumb";
import { useInsertionOrders, type InsertionOrderWithMetrics } from "@/hooks/useInsertionOrders";
import { useProfiles } from "@/hooks/useProfiles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Building, FolderOpen, Search, Filter, User, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";



const InsertionOrders = () => {
  const { insertionOrders, loading, updateInsertionOrder, deleteInsertionOrder } = useInsertionOrders();
  const { profiles } = useProfiles();
  const [searchTerm, setSearchTerm] = useState("");
  const [creatorFilter, setCreatorFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingOrder, setEditingOrder] = useState<InsertionOrderWithMetrics | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const { toast } = useToast();

  const { generateBreadcrumbs } = useBreadcrumbs();
  const breadcrumbs = generateBreadcrumbs();
  
  const uniqueCreators = useMemo(() => {
    if (profiles.length > 0) {
      return profiles.map(p => p.email).sort();
    }
    const creators = insertionOrders
      .filter(io => io.profile?.email)
      .map(io => io.profile!.email)
      .filter((email, index, arr) => arr.indexOf(email) === index);
    return creators.sort();
  }, [profiles, insertionOrders]);

  const filteredInsertionOrders = useMemo(() => {
    return insertionOrders.filter(order => {
      const matchesSearch = 
        order.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.description && order.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCreator = 
        creatorFilter === "all" || 
        order.profile?.email === creatorFilter;
      const matchesStatus = 
        statusFilter === "all" || 
        order.status === statusFilter;
      return matchesSearch && matchesCreator && matchesStatus;
    });
  }, [insertionOrders, searchTerm, creatorFilter, statusFilter]);
  
  const totalPages = Math.ceil(filteredInsertionOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInsertionOrders = filteredInsertionOrders.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, creatorFilter, statusFilter]);
  
  const totalOrders = filteredInsertionOrders.length;
  const activeOrders = filteredInsertionOrders.filter(o => o.status === 'active').length;
  const totalCampaigns = filteredInsertionOrders.reduce((sum, o) => sum + o.campaigns_count, 0);

  const clearFilters = () => {
    setSearchTerm("");
    setCreatorFilter("all");
    setStatusFilter("all");
  };

  const handleCreated = useCallback(() => {}, []);

  const handleEdit = (order: InsertionOrderWithMetrics) => {
    setEditingOrder(order);
    setEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteInsertionOrder(id);
    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a insertion order.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Insertion Order excluída",
        description: "A insertion order foi excluída com sucesso.",
      });
    }
    setDeletingOrder(null);
  };

  return (
    <AppLayout 
      subtitle="Gerencie suas insertion orders e organize criativos por cliente"
      breadcrumbs={breadcrumbs}
      actions={<CreateInsertionOrderDialog onCreated={handleCreated} />}
    >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <MetricsCard icon={Building} value={totalOrders} label="Insertion Orders" />
                <MetricsCard icon={Activity} value={activeOrders} label="Ativas" className="bg-green-500/10" iconColor="text-green-500" />
                <MetricsCard icon={FolderOpen} value={totalCampaigns} label="Total de Criativos" className="bg-blue-500/10" iconColor="text-blue-500" />
              </>
            )}
          </div>

        <div className="p-4 section-surface rounded-lg border mb-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input placeholder="Buscar insertion orders..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                
                <Select value={creatorFilter} onValueChange={setCreatorFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <User className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os criadores</SelectItem>
                    {uniqueCreators.map((creator) => (
                      <SelectItem key={creator} value={creator}>{creator}</SelectItem>
                    ))}
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
                    <SelectItem value="completed">Concluídas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {(searchTerm || creatorFilter !== "all" || statusFilter !== "all") && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {filteredInsertionOrders.length} resultado{filteredInsertionOrders.length !== 1 ? 's' : ''}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-8">
                    Limpar filtros
                  </Button>
                </div>
              )}
            </div>
          </div>

        <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium">Insertion Orders</h2>
              <Badge variant="outline" className="text-xs">
                {filteredInsertionOrders.length} IO's
                {filteredInsertionOrders.length !== insertionOrders.length && (
                  <span className="text-muted-foreground ml-1">de {insertionOrders.length}</span>
                )}
              </Badge>
            </div>

            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-48 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredInsertionOrders.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-muted-foreground mb-4">
                    {searchTerm || creatorFilter !== "all" || statusFilter !== "all" ? (
                      <>
                        <Filter className="w-12 h-12 mx-auto mb-2 opacity-40" />
                        <p>Nenhuma insertion order encontrada com os filtros aplicados</p>
                        <Button variant="link" onClick={clearFilters} className="text-sm mt-2">Limpar filtros</Button>
                      </>
                    ) : (
                      <>
                        <Building className="w-12 h-12 mx-auto mb-2 opacity-40" />
                        <p className="mb-4">Nenhuma insertion order criada ainda</p>
                        <CreateInsertionOrderDialog onCreated={handleCreated} />
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4">
                  {paginatedInsertionOrders.map((order) => (
                    <InsertionOrderCard 
                      key={order.id} 
                      insertionOrder={order}
                      onEdit={handleEdit}
                      onDelete={(id) => setDeletingOrder(id)}
                    />
                  ))}
                </div>
                
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </>
            )}
        </div>

      <EditInsertionOrderDialog 
        insertionOrder={editingOrder}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      <AlertDialog open={!!deletingOrder} onOpenChange={() => setDeletingOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Insertion Order</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta insertion order? Esta ação também excluirá todos os criativos associados e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingOrder && handleDelete(deletingOrder)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default InsertionOrders;
