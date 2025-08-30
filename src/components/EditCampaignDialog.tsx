import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useCampaigns, type CampaignWithTags } from "@/hooks/useCampaigns";
import { useInsertionOrders } from "@/hooks/useInsertionOrders";
import { supabase } from "@/integrations/supabase/client";

interface EditCampaignDialogProps {
  campaign: CampaignWithTags | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditCampaignDialog = ({ campaign, open, onOpenChange }: EditCampaignDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");
  const [insertionOrderId, setInsertionOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const { insertionOrders } = useInsertionOrders();
  const { toast } = useToast();

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (campaign && open) {
      setName(campaign.name);
      setDescription(campaign.description || "");
      setStatus(campaign.status);
      setInsertionOrderId(campaign.insertion_order_id || "none");
    }
  }, [campaign, open]);

  const updateCampaign = async (campaignId: string, updates: any) => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', campaignId)
        .select()
        .single();

      if (error) {
        console.error('Error updating campaign:', error);
        return { error: 'Erro ao atualizar campanha' };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in updateCampaign:', error);
      return { error: 'Erro inesperado ao atualizar campanha' };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign || !name.trim()) return;

    setLoading(true);

    const updates = {
      name: name.trim(),
      description: description.trim() || null,
      status: status,
      insertion_order_id: insertionOrderId === "none" ? null : insertionOrderId,
      updated_at: new Date().toISOString()
    };

    const { error } = await updateCampaign(campaign.id, updates);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a campanha.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Campanha atualizada!",
        description: "As informações foram salvas com sucesso.",
      });
      onOpenChange(false);
      // Força refresh da página para mostrar os dados atualizados
      window.location.reload();
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
          <DialogTitle>Editar Campanha</DialogTitle>
          <DialogDescription>
            Atualize as informações da campanha, incluindo a insertion order associada.
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
              disabled={loading}
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
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="insertionOrder">Insertion Order</Label>
            <Select value={insertionOrderId} onValueChange={setInsertionOrderId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma insertion order (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma insertion order</SelectItem>
                {insertionOrders.map((io) => (
                  <SelectItem key={io.id} value={io.id}>
                    {io.client_name} {io.project_name && `- ${io.project_name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A insertion order organiza suas campanhas por cliente/projeto
            </p>
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
              </SelectContent>
            </Select>
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