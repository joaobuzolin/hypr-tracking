import React, { memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Building, FolderOpen, MousePointer, Calendar } from 'lucide-react';
import type { InsertionOrderWithMetrics } from '@/hooks/useInsertionOrders';

interface InsertionOrderCardProps {
  insertionOrder: InsertionOrderWithMetrics;
  onEdit?: (order: InsertionOrderWithMetrics) => void;
  onDelete?: (id: string) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'default';
    case 'paused':
      return 'secondary';
    case 'completed':
      return 'outline';
    default:
      return 'secondary';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active':
      return 'Ativa';
    case 'paused':
      return 'Pausada';
    case 'completed':
      return 'Concluída';
    default:
      return status;
  }
};

export const InsertionOrderCard = memo(({ insertionOrder, onEdit, onDelete }: InsertionOrderCardProps) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/insertion-orders/${insertionOrder.id}/campanhas`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  };

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-200 h-full cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 section-surface"
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Ver campanhas de ${insertionOrder.client_name}`}
    >
      <CardHeader className="pb-3 px-4 md:px-6 py-4 md:py-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-3 lg:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-muted-foreground shrink-0" />
                <CardTitle className="text-sm md:text-lg font-semibold break-words">
                  {insertionOrder.client_name}
                </CardTitle>
              </div>
              <Badge variant={getStatusColor(insertionOrder.status)} className="text-xs w-fit">
                {getStatusLabel(insertionOrder.status)}
              </Badge>
            </div>
            
            {insertionOrder.description && (
              <CardDescription className="text-xs md:text-sm mt-1 break-words">
                {insertionOrder.description}
              </CardDescription>
            )}
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-xs text-muted-foreground">
              {insertionOrder.profile && (
                <span className="break-all">Criado por: {insertionOrder.profile.email}</span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 shrink-0" />
                {new Date(insertionOrder.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onEdit(insertionOrder);
                }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(insertionOrder.id);
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 px-4 md:px-6 pb-3 md:pb-4">
        <div className="space-y-2 md:space-y-3">
          {/* Métricas responsivas - stack no mobile, grid no desktop */}
          <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1.5 md:gap-2">
            <div className="flex justify-between items-center sm:flex-col sm:text-center p-1.5 md:p-2 bg-background rounded border">
              <div className="sm:hidden text-xs text-muted-foreground">Criativos</div>
              <div className="text-sm md:text-base font-semibold">{insertionOrder.campaigns_count}</div>
              <div className="hidden sm:block text-xs text-muted-foreground">Criativos</div>
            </div>
            <div className="flex justify-between items-center sm:flex-col sm:text-center p-1.5 md:p-2 bg-background rounded border">
              <div className="sm:hidden text-xs text-muted-foreground">Tags</div>
              <div className="text-sm md:text-base font-semibold">{insertionOrder.total_tags}</div>
              <div className="hidden sm:block text-xs text-muted-foreground">Tags</div>
            </div>
            <div className="flex justify-between items-center sm:flex-col sm:text-center p-1.5 md:p-2 bg-background rounded border">
              <div className="sm:hidden text-xs text-muted-foreground">Clicks</div>
              <div className="text-sm md:text-base font-semibold">{insertionOrder.total_clicks}</div>
              <div className="hidden sm:block text-xs text-muted-foreground">Clicks</div>
            </div>
          </div>

          <Separator />

          {/* Período com botão inline */}
          {(insertionOrder.start_date || insertionOrder.end_date) ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h4 className="font-medium text-xs md:text-sm mb-1">Período</h4>
                <div className="text-xs text-muted-foreground">
                  {insertionOrder.start_date && (
                    <span>Início: {new Date(insertionOrder.start_date).toLocaleDateString('pt-BR')}</span>
                  )}
                  {insertionOrder.start_date && insertionOrder.end_date && <span> • </span>}
                  {insertionOrder.end_date && (
                    <span>Fim: {new Date(insertionOrder.end_date).toLocaleDateString('pt-BR')}</span>
                  )}
                </div>
              </div>
              <Link 
                to={`/insertion-orders/${insertionOrder.id}/campanhas`}
                onClick={(e) => e.stopPropagation()}
                className="shrink-0"
              >
                <Button variant="default" size="sm" className="gap-2 text-xs">
                  <MousePointer className="w-3 h-3" />
                  Nova Campanha
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex justify-end">
              <Link 
                to={`/insertion-orders/${insertionOrder.id}/campanhas`}
                onClick={(e) => e.stopPropagation()}
              >
                <Button variant="default" size="sm" className="gap-2 text-xs">
                  <MousePointer className="w-3 h-3" />
                  Nova Campanha
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

InsertionOrderCard.displayName = 'InsertionOrderCard';