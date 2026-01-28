import { memo, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { useToast } from "@/hooks/use-toast";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateSelect: (range: DateRange | undefined) => void;
}

export const DateRangePicker = memo(({ dateRange, onDateSelect }: DateRangePickerProps) => {
  const { toast } = useToast();
  
  // Calculate minimum date (90 days ago) - memoized to prevent recalculation
  const minDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 90);
    return date;
  }, []);

  // Stable callback for date selection
  const handleDateSelect = useCallback((newRange: DateRange | undefined) => {
    if (!newRange?.from || !newRange?.to) {
      onDateSelect(newRange);
      return;
    }

    // Check if the range exceeds 90 days
    const diffInDays = Math.ceil(
      (newRange.to.getTime() - newRange.from.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays > 90) {
      toast({
        title: "Período muito longo",
        description: "O período selecionado não pode exceder 90 dias. Por favor, selecione um intervalo menor.",
        variant: "destructive"
      });
      return;
    }

    // Check if start date is too old
    if (newRange.from < minDate) {
      toast({
        title: "Data indisponível",
        description: "Dados anteriores aos últimos 90 dias não estão disponíveis no sistema.",
        variant: "destructive"
      });
      return;
    }

    onDateSelect(newRange);
  }, [onDateSelect, minDate, toast]);

  // Stable disabled date checker
  const isDateDisabled = useCallback((date: Date) => {
    // Disable future dates
    if (date > new Date()) return true;
    // Disable dates older than 90 days
    if (date < minDate) return true;
    return false;
  }, [minDate]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !dateRange?.from && !dateRange?.to && "text-muted-foreground"
          )}
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
            <span>Período</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={dateRange?.from}
          selected={dateRange}
          onSelect={handleDateSelect}
          numberOfMonths={2}
          className="p-3"
          disabled={isDateDisabled}
        />
      </PopoverContent>
    </Popover>
  );
});

DateRangePicker.displayName = "DateRangePicker";
