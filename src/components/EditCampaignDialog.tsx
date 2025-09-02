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
import { useCampaignGroups } from "@/hooks/useCampaignGroups";
import { supabase } from "@/integrations/supabase/client";

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

interface EditCampaignDialogProps {
  campaign: CampaignWithTags | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditCampaignDialog = ({ campaign, open, onOpenChange }: EditCampaignDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [shortToken, setShortToken] = useState("");
  const [insertionOrderId, setInsertionOrderId] = useState("");
  const [campaignGroupId, setCampaignGroupId] = useState("");
  const [creativeFormat, setCreativeFormat] = useState("300x250");
  const [loading, setLoading] = useState(false);
  const { insertionOrders } = useInsertionOrders();
  const { campaignGroups } = useCampaignGroups();
  const { toast } = useToast();

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (campaign && open) {
      setName(campaign.name);
      setDescription(campaign.description || "");
      setShortToken(campaign.short_token || "");
      setInsertionOrderId(campaign.insertion_order_id || "none");
      setCampaignGroupId(campaign.campaign_group_id || "none");
      setCreativeFormat(campaign.creative_format || "300x250");
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
      short_token: shortToken.trim() || null,
      insertion_order_id: insertionOrderId === "none" ? null : insertionOrderId,
      campaign_group_id: campaignGroupId === "none" ? null : campaignGroupId,
      creative_format: creativeFormat,
      updated_at: new Date().toISOString()
    };

    const { error } = await updateCampaign(campaign.id, updates);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o criativo.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Criativo atualizado!",
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
          <DialogTitle>Editar Criativo</DialogTitle>
          <DialogDescription>
            Atualize as informações do criativo, incluindo a insertion order e campanha associadas.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Criativo *</Label>
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
              placeholder="Descrição opcional do criativo"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shortToken">Short Token</Label>
            <Input
              id="shortToken"
              placeholder="Token curto para identificação (opcional)"
              value={shortToken}
              onChange={(e) => setShortToken(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Token opcional para identificação rápida do criativo
            </p>
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
                    {io.client_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A insertion order organiza suas campanhas por cliente/projeto
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaignGroup">Campanha</Label>
            <Select value={campaignGroupId} onValueChange={setCampaignGroupId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma campanha (opcional)" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-md">
                <SelectItem value="none">Nenhuma campanha</SelectItem>
                {campaignGroups
                  .filter(cg => !insertionOrderId || insertionOrderId === "none" || cg.insertion_order_id === insertionOrderId)
                  .map((cg) => (
                    <SelectItem key={cg.id} value={cg.id}>
                      {cg.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A campanha agrupa criativos relacionados dentro de uma insertion order
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="creativeFormat">Formato IAB *</Label>
            <Select value={creativeFormat} onValueChange={setCreativeFormat} disabled={loading}>
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
            <p className="text-xs text-muted-foreground">
              O formato define as dimensões do criativo publicitário
            </p>
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