import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCampaignGroups } from "@/hooks/useCampaignGroups";
import { useInsertionOrders } from "@/hooks/useInsertionOrders";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface CreateCampaignGroupDialogProps {
  insertionOrderId?: string;
}

export const CreateCampaignGroupDialog = ({ insertionOrderId }: CreateCampaignGroupDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedInsertionOrderId, setSelectedInsertionOrderId] = useState(insertionOrderId || "");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { createCampaignGroup } = useCampaignGroups();
  const { insertionOrders } = useInsertionOrders();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedInsertionOrderId) return;

    setLoading(true);

    const { error } = await createCampaignGroup({
      name: name.trim(),
      description: description.trim(),
      insertion_order_id: selectedInsertionOrderId,
      start_date: dateRange?.from?.toISOString().split('T')[0],
      end_date: dateRange?.to?.toISOString().split('T')[0]
    });

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar a campanha.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Campanha criada!",
        description: "A campanha foi criada com sucesso.",
      });
      
      // Reset form
      setName("");
      setDescription("");
      setDateRange(undefined);
      if (!insertionOrderId) {
        setSelectedInsertionOrderId("");
      }
      setOpen(false);
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Campanha
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Criar Nova Campanha</DialogTitle>
          <DialogDescription>
            Crie uma nova campanha para organizar seus criativos.
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

          {!insertionOrderId && (
            <div className="space-y-2">
              <Label htmlFor="insertion-order">Insertion Order *</Label>
              <Select
                value={selectedInsertionOrderId}
                onValueChange={setSelectedInsertionOrderId}
                disabled={loading}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma Insertion Order" />
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
            <Label>Período da Campanha (Opcional)</Label>
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
              {loading ? 'Criando...' : 'Criar Campanha'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};