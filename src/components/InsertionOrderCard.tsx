import React, { memo } from 'react';
import { Link } from 'react-router-dom';
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
  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Building className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-lg font-semibold">
                {insertionOrder.client_name}
              </CardTitle>
              <Badge variant={getStatusColor(insertionOrder.status)} className="text-xs">
                {getStatusLabel(insertionOrder.status)}
              </Badge>
            </div>
            
            {insertionOrder.description && (
              <CardDescription className="text-sm mt-1">
                {insertionOrder.description}
              </CardDescription>
            )}
            
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              {insertionOrder.profile && (
                <span>Criado por: {insertionOrder.profile.email}</span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(insertionOrder.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(insertionOrder)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(insertionOrder.id)}
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
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Métricas */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-neutral-50 rounded border">
              <div className="text-lg font-semibold">{insertionOrder.campaigns_count}</div>
              <div className="text-xs text-neutral-600">Campanhas</div>
            </div>
            <div className="text-center p-3 bg-neutral-50 rounded border">
              <div className="text-lg font-semibold">{insertionOrder.total_tags}</div>
              <div className="text-xs text-neutral-600">Tags</div>
            </div>
            <div className="text-center p-3 bg-neutral-50 rounded border">
              <div className="text-lg font-semibold">{insertionOrder.total_clicks}</div>
              <div className="text-xs text-neutral-600">Clicks</div>
            </div>
          </div>

          <Separator />

          {/* Período */}
          {(insertionOrder.start_date || insertionOrder.end_date) && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Período</h4>
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
          )}

          {/* Ações */}
          <div className="flex gap-2">
            <Link to={`/insertion-orders/${insertionOrder.id}/campaigns`} className="flex-1">
              <Button variant="outline" className="w-full gap-2">
                <FolderOpen className="w-4 h-4" />
                Ver Campanhas ({insertionOrder.campaigns_count})
              </Button>
            </Link>
            <Link to={`/insertion-orders/${insertionOrder.id}/campaigns/new`}>
              <Button variant="default" className="gap-2">
                <MousePointer className="w-4 h-4" />
                Nova Campanha
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

InsertionOrderCard.displayName = 'InsertionOrderCard';