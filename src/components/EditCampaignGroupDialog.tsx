import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCampaignGroups, type CampaignGroup } from "@/hooks/useCampaignGroups";
import { useInsertionOrders } from "@/hooks/useInsertionOrders";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface EditCampaignGroupDialogProps {
  campaignGroup: CampaignGroup;
  children?: React.ReactNode;
}

export const EditCampaignGroupDialog = ({ campaignGroup, children }: EditCampaignGroupDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(campaignGroup.name);
  const [description, setDescription] = useState(campaignGroup.description || "");
  const [status, setStatus] = useState(campaignGroup.status);
  const [insertionOrderId, setInsertionOrderId] = useState(campaignGroup.insertion_order_id);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (campaignGroup.start_date || campaignGroup.end_date) {
      return {
        from: campaignGroup.start_date ? new Date(campaignGroup.start_date) : undefined,
        to: campaignGroup.end_date ? new Date(campaignGroup.end_date) : undefined
      };
    }
    return undefined;
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { updateCampaignGroup } = useCampaignGroups();
  const { insertionOrders } = useInsertionOrders();

  useEffect(() => {
    if (open) {
      setName(campaignGroup.name);
      setDescription(campaignGroup.description || "");
      setStatus(campaignGroup.status);
      setInsertionOrderId(campaignGroup.insertion_order_id);
      setDateRange(() => {
        if (campaignGroup.start_date || campaignGroup.end_date) {
          return {
            from: campaignGroup.start_date ? new Date(campaignGroup.start_date) : undefined,
            to: campaignGroup.end_date ? new Date(campaignGroup.end_date) : undefined
          };
        }
        return undefined;
      });
    }
  }, [open, campaignGroup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);

    const { error } = await updateCampaignGroup(campaignGroup.id, {
      name: name.trim(),
      description: description.trim(),
      status,
      insertion_order_id: insertionOrderId,
      start_date: dateRange?.from?.toISOString().split('T')[0],
      end_date: dateRange?.to?.toISOString().split('T')[0]
    });

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a campanha.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Campanha atualizada!",
        description: "As informações da campanha foram atualizadas com sucesso.",
      });
      
      setOpen(false);
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="w-4 h-4" />
            Editar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Editar Campanha</DialogTitle>
          <DialogDescription>
            Atualize as informações da campanha.
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
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value: 'active' | 'paused') => setStatus(value)} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-md">
                <SelectItem value="active">Ativa</SelectItem>
                <SelectItem value="paused">Pausada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="insertionOrder">Insertion Order *</Label>
            <Select value={insertionOrderId} onValueChange={setInsertionOrderId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma insertion order" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-md">
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
            <Label>Período da Campanha</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !dateRange?.from && !dateRange?.to && "text-muted-foreground"
                  )}
                  disabled={loading}
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
                    <span>Selecionar período</span>
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
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1" disabled={loading}>
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