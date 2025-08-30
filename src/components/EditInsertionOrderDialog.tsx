import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useInsertionOrders, type InsertionOrderWithMetrics } from "@/hooks/useInsertionOrders";

interface EditInsertionOrderDialogProps {
  insertionOrder: InsertionOrderWithMetrics | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditInsertionOrderDialog = ({ insertionOrder, open, onOpenChange }: EditInsertionOrderDialogProps) => {
  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const { updateInsertionOrder } = useInsertionOrders();
  const { toast } = useToast();

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (insertionOrder && open) {
      setClientName(insertionOrder.client_name);
      setProjectName(insertionOrder.project_name || "");
      setDescription(insertionOrder.description || "");
      setStatus(insertionOrder.status);
      setStartDate(insertionOrder.start_date || "");
      setEndDate(insertionOrder.end_date || "");
    }
  }, [insertionOrder, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!insertionOrder || !clientName.trim()) return;

    setLoading(true);

    const { error } = await updateInsertionOrder(insertionOrder.id, {
      client_name: clientName.trim(),
      project_name: projectName.trim() || undefined,
      description: description.trim() || undefined,
      status: status as any,
      start_date: startDate || undefined,
      end_date: endDate || undefined
    });

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a insertion order.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Insertion Order atualizada!",
        description: "As informações foram salvas com sucesso.",
      });
      onOpenChange(false);
    }

    setLoading(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Insertion Order</DialogTitle>
          <DialogDescription>
            Atualize as informações da insertion order.
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
            <Label htmlFor="projectName">Nome do Projeto</Label>
            <Input
              id="projectName"
              placeholder="Ex: Campanha Black Friday 2024"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
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
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativa</SelectItem>
                <SelectItem value="paused">Pausada</SelectItem>
                <SelectItem value="completed">Concluída</SelectItem>
              </SelectContent>
            </Select>
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
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1" disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};