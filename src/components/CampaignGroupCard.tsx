import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EditCampaignGroupDialog } from '@/components/EditCampaignGroupDialog';
import { BarChart3, MousePointer, Eye, Users, Calendar, MoreVertical, Settings } from 'lucide-react';
import type { CampaignGroup } from '@/hooks/useCampaignGroups';

interface CampaignGroupCardProps {
  campaignGroup: CampaignGroup;
}

const calculateCTR = (clicks: number, pageViews: number) => {
  return pageViews > 0 ? ((clicks / pageViews) * 100).toFixed(2) : "0.00";
};

export const CampaignGroupCard = memo(({ campaignGroup }: CampaignGroupCardProps) => {
  const ctr = calculateCTR(campaignGroup.total_clicks || 0, campaignGroup.total_page_views || 0);
  
  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow h-full">
      <CardHeader className="pb-3 px-4 md:px-6 py-4 md:py-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-3 lg:gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm md:text-lg font-semibold break-words">
              {campaignGroup.name}
            </CardTitle>
            {campaignGroup.description && (
              <CardDescription className="text-xs md:text-sm break-words">
                {campaignGroup.description}
              </CardDescription>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
              {campaignGroup.start_date && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span className="break-words">
                    {new Date(campaignGroup.start_date).toLocaleDateString('pt-BR')}
                    {campaignGroup.end_date && (
                      <> - {new Date(campaignGroup.end_date).toLocaleDateString('pt-BR')}</>
                    )}
                  </span>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                Criada em: {new Date(campaignGroup.created_at).toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={campaignGroup.derivedStatus === 'active' ? 'default' : 'secondary'} className="text-xs">
              {campaignGroup.derivedStatus === 'active' ? 'Ativa' : 'Pausada'}
            </Badge>
            
            {/* Menu de ações */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <EditCampaignGroupDialog campaignGroup={campaignGroup}>
                  <DropdownMenuItem 
                    onSelect={(e) => e.preventDefault()} // Previne fechar o dropdown automaticamente
                    className="gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Editar Campanha
                  </DropdownMenuItem>
                </EditCampaignGroupDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 px-4 md:px-6 pb-4 md:pb-6">
        <div className="space-y-3 md:space-y-4">
          {/* Métricas responsivas - stack no mobile, grid no desktop */}
          <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
            <div className="flex justify-between items-center sm:flex-col sm:text-center p-2 md:p-3 bg-muted/50 rounded border">
              <div className="sm:hidden text-xs text-muted-foreground">Criativos</div>
              <div className="text-sm md:text-lg font-semibold">{campaignGroup.campaigns_count || 0}</div>
              <div className="hidden sm:block text-xs text-muted-foreground">Criativos</div>
            </div>
            <div className="flex justify-between items-center sm:flex-col sm:text-center p-2 md:p-3 bg-blue-50 rounded border">
              <div className="sm:hidden text-xs text-blue-600">Total Clicks</div>
              <div className="text-sm md:text-lg font-semibold">{campaignGroup.total_clicks || 0}</div>
              <div className="hidden sm:block text-xs text-blue-600">Total Clicks</div>
            </div>
            <div className="flex justify-between items-center sm:flex-col sm:text-center p-2 md:p-3 bg-purple-50 rounded border">
              <div className="sm:hidden text-xs text-purple-600">Page Views</div>
              <div className="text-sm md:text-lg font-semibold">{campaignGroup.total_page_views || 0}</div>
              <div className="hidden sm:block text-xs text-purple-600">Page Views</div>
            </div>
            <div className="flex justify-between items-center sm:flex-col sm:text-center p-2 md:p-3 bg-green-50 rounded border">
              <div className="sm:hidden text-xs text-green-600">CTR</div>
              <div className="text-sm md:text-lg font-semibold">{ctr}%</div>
              <div className="hidden sm:block text-xs text-green-600">CTR</div>
            </div>
          </div>

          <Separator />

          {/* Ações */}
          <div className="flex gap-2">
            <Link 
              to={`/campanhas/${campaignGroup.id}/criativos`} 
              className="flex-1"
            >
              <Button className="w-full gap-2 text-xs md:text-sm">
                <BarChart3 className="w-4 h-4" />
                <span className="break-words">Ver Criativos ({campaignGroup.campaigns_count || 0})</span>
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

CampaignGroupCard.displayName = 'CampaignGroupCard';