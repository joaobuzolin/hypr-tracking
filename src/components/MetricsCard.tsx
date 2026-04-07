import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { formatCompactNumber } from '@/lib/utils';

interface MetricsCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  className?: string;
  iconColor?: string;
}

export const MetricsCard = memo(({ icon: Icon, value, label, className, iconColor }: MetricsCardProps) => {
  const displayValue = typeof value === 'number' ? formatCompactNumber(value) : value;
  const fullValue = typeof value === 'number' ? value.toLocaleString() : value;
  
  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-3 md:p-4">
        <div className="flex items-center gap-2 md:gap-3">
          <div className={`p-1.5 md:p-2 rounded-md ${className || 'bg-muted'}`}>
            <Icon className={`w-4 h-4 md:w-5 md:h-5 ${iconColor || 'text-muted-foreground'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div 
              className="text-lg md:text-xl font-semibold truncate" 
              title={typeof value === 'number' ? fullValue : undefined}
            >
              {displayValue}
            </div>
            <div className="text-xs md:text-sm text-muted-foreground truncate">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

MetricsCard.displayName = 'MetricsCard';