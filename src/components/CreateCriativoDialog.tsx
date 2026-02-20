import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

interface CreateCriativoDialogProps {
  onCriativoCreated: () => void;
  insertionOrderId?: string;
  campaignGroupId?: string;
  createCampaign: (data: any) => Promise<any>;
  campaignGroups?: any[];
  insertionOrders?: any[];
}

export const CreateCriativoDialog = ({ 
  onCriativoCreated,
  insertionOrderId,
  campaignGroupId,
  createCampaign,
  campaignGroups = [],
  insertionOrders = []
}: CreateCriativoDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [shortToken, setShortToken] = useState("");
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
      short_token: shortToken.trim() || undefined,
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
      
      setName("");
      setDescription("");
      setShortToken("");
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
      <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Criativo</DialogTitle>
          <DialogDescription>
            Crie um novo criativo. Você poderá adicionar tags de tracking após a criação.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
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
            <Label htmlFor="short-token">Short Token</Label>
            <Input
              id="short-token"
              placeholder="Ex: TBGJ1R (6 caracteres)"
              value={shortToken}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (value.length <= 6) {
                  setShortToken(value);
                }
              }}
              maxLength={6}
              disabled={loading}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Opcional. Código alfanumérico de 6 caracteres (letras e números).
            </p>
          </div>
          {!campaignGroupId && (
            <div className="space-y-2">
              <Label htmlFor="campaign-group">Grupo de Campanha *</Label>
              <Select value={selectedCampaignGroupId} onValueChange={(val) => {
                setSelectedCampaignGroupId(val);
                const group = campaignGroups.find((g: any) => g.id === val);
                setSelectedInsertionOrderId(group?.insertion_order_id || "");
              }} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o grupo de campanha" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-md z-50">
                  {campaignGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!insertionOrderId && (() => {
            const activeGroupId = selectedCampaignGroupId || campaignGroupId;
            const selectedGroup = campaignGroups.find((g: any) => g.id === activeGroupId);
            const filteredIOs = selectedGroup?.insertion_order_id
              ? insertionOrders.filter((io: any) => io.id === selectedGroup.insertion_order_id)
              : insertionOrders;
            return (
              <div className="space-y-2">
                <Label htmlFor="insertion-order">Insertion Order</Label>
                <Select value={selectedInsertionOrderId} onValueChange={setSelectedInsertionOrderId} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o insertion order (opcional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-md z-50">
                    {filteredIOs.map((io: any) => (
                      <SelectItem key={io.id} value={io.id}>
                        {io.client_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })()}

          <div className="space-y-2">
            <Label htmlFor="iab-format">Formato IAB *</Label>
            <Select value={iabFormat} onValueChange={setIabFormat} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o formato IAB" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-md z-50">
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
