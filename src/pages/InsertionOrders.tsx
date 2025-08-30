import { useState, useMemo, useCallback } from "react";
import { UserMenu } from "@/components/UserMenu";
import { InsertionOrderCard } from "@/components/InsertionOrderCard";
import { EditInsertionOrderDialog } from "@/components/EditInsertionOrderDialog";
import { MetricsCard } from "@/components/MetricsCard";
import { Breadcrumb, useBreadcrumbs } from "@/components/Breadcrumb";
import { useInsertionOrders, type InsertionOrderWithMetrics } from "@/hooks/useInsertionOrders";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Building, FolderOpen, MousePointer, Search, Filter, User, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const CreateInsertionOrderDialog = ({ onCreated }: { onCreated: () => void }) => {
  const [open, setOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const { createInsertionOrder } = useInsertionOrders();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    setLoading(true);

    const { error } = await createInsertionOrder({
      client_name: clientName.trim(),
      description: description.trim() || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined
    });

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar a insertion order.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Insertion Order criada!",
        description: "Agora você pode criar campanhas dentro desta insertion order.",
      });
      
      // Reset form
      setClientName("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setOpen(false);
      onCreated();
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Insertion Order
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Criar Nova Insertion Order</DialogTitle>
          <DialogDescription>
            Crie uma nova insertion order para organizar suas campanhas por cliente/projeto.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">Nome do Cliente *</Label>
            <Input
              id="clientName"
              placeholder="Ex: Acme Corporation"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descrição opcional do projeto"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={loading}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data de Início</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data de Fim</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1" disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Insertion Order'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const InsertionOrders = () => {
  const { insertionOrders, loading, updateInsertionOrder, deleteInsertionOrder } = useInsertionOrders();
  const [searchTerm, setSearchTerm] = useState("");
  const [creatorFilter, setCreatorFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingOrder, setEditingOrder] = useState<InsertionOrderWithMetrics | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState<string | null>(null);
  const { toast } = useToast();

  const { generateBreadcrumbs } = useBreadcrumbs();
  const breadcrumbs = [
    { label: "Insertion Orders", icon: Building }
  ];
  
  // Get unique creators for filter options
  const uniqueCreators = useMemo(() => {
    const creators = insertionOrders
      .filter(io => io.profile?.email)
      .map(io => io.profile!.email)
      .filter((email, index, arr) => arr.indexOf(email) === index);
    return creators.sort();
  }, [insertionOrders]);

  // Filtered insertion orders
  const filteredInsertionOrders = useMemo(() => {
    return insertionOrders.filter(order => {
      // Search filter
      const matchesSearch = 
        order.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.description && order.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Creator filter
      const matchesCreator = 
        creatorFilter === "all" || 
        order.profile?.email === creatorFilter;
      
      // Status filter
      const matchesStatus = 
        statusFilter === "all" || 
        order.status === statusFilter;
      
      return matchesSearch && matchesCreator && matchesStatus;
    });
  }, [insertionOrders, searchTerm, creatorFilter, statusFilter]);
  
  const totalOrders = filteredInsertionOrders.length;
  const activeOrders = filteredInsertionOrders.filter(o => o.status === 'active').length;
  const totalCampaigns = filteredInsertionOrders.reduce((sum, o) => sum + o.campaigns_count, 0);

  const clearFilters = () => {
    setSearchTerm("");
    setCreatorFilter("all");
    setStatusFilter("all");
  };

  const handleCreated = useCallback(() => {
    // Orders will be refreshed automatically by the hook
  }, []);

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
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
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
                Gerencie suas insertion orders e organize campanhas por cliente
              </p>
            </div>
            <div className="flex gap-3">
              <UserMenu />
              <Link to="/campaigns">
                <Button variant="outline" className="gap-2">
                  <FolderOpen className="w-4 h-4" />
                  Campanhas
                </Button>
              </Link>
              <CreateInsertionOrderDialog onCreated={handleCreated} />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-32">
        <div className="container mx-auto px-4 py-6">
          {/* Breadcrumb Navigation */}
          <Breadcrumb items={breadcrumbs} />
          
          {/* Stats Overview */}
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
                  icon={Building}
                  value={totalOrders}
                  label="Insertion Orders"
                />
                
                <MetricsCard
                  icon={Activity}
                  value={activeOrders}
                  label="Ativas"
                  className="bg-green-50"
                  iconColor="text-green-600"
                />
                
                <MetricsCard
                  icon={FolderOpen}
                  value={totalCampaigns}
                  label="Total de Campanhas"
                  className="bg-blue-50"
                  iconColor="text-blue-600"
                />
              </>
            )}
          </div>

          {/* Filters Section */}
          <div className="p-4 bg-muted/50 rounded-lg border mb-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar insertion orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
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

          {/* Insertion Orders List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium">Insertion Orders</h2>
              <Badge variant="outline" className="text-xs">
                {filteredInsertionOrders.length} ordem{filteredInsertionOrders.length !== 1 ? 'ns' : ''}
                {filteredInsertionOrders.length !== insertionOrders.length && (
                  <span className="text-muted-foreground ml-1">de {insertionOrders.length}</span>
                )}
              </Badge>
            </div>

            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Card key={i} className="border shadow-sm">
                    <CardContent className="p-6">
                      <Skeleton className="h-48 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredInsertionOrders.length === 0 ? (
              <Card className="border shadow-sm">
                <CardContent className="p-8 text-center">
                  <div className="text-muted-foreground mb-4">
                    {searchTerm || creatorFilter !== "all" || statusFilter !== "all" ? (
                      <>
                        <Filter className="w-12 h-12 mx-auto mb-2 opacity-40" />
                        <p>Nenhuma insertion order encontrada com os filtros aplicados</p>
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
                        <Building className="w-12 h-12 mx-auto mb-2 opacity-40" />
                        <p className="mb-4">Nenhuma insertion order criada ainda</p>
                        <CreateInsertionOrderDialog onCreated={handleCreated} />
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredInsertionOrders.map((order) => (
                  <InsertionOrderCard 
                    key={order.id} 
                    insertionOrder={order}
                    onEdit={handleEdit}
                    onDelete={(id) => setDeletingOrder(id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <EditInsertionOrderDialog 
        insertionOrder={editingOrder}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingOrder} onOpenChange={() => setDeletingOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Insertion Order</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta insertion order? Esta ação também excluirá todas as campanhas associadas e não pode ser desfeita.
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
    </div>
  );
};

export default InsertionOrders;