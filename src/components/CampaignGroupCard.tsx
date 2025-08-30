import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { BarChart3, MousePointer, Eye, Users, Calendar } from 'lucide-react';
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
    <Card className="border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">
              {campaignGroup.name}
            </CardTitle>
            <CardDescription className="text-sm">
              {campaignGroup.description}
            </CardDescription>
            <div className="flex items-center gap-4 mt-2">
              {campaignGroup.start_date && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>
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
          <Badge variant={campaignGroup.status === 'active' ? 'default' : 'secondary'} className="text-xs">
            {campaignGroup.status === 'active' ? 'Ativa' : 'Pausada'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Métricas gerais */}
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-3 bg-neutral-50 rounded border">
              <div className="text-lg font-semibold">{campaignGroup.campaigns_count || 0}</div>
              <div className="text-xs text-neutral-600">Criativos</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded border">
              <div className="text-lg font-semibold">{campaignGroup.total_clicks || 0}</div>
              <div className="text-xs text-blue-600">Total Clicks</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded border">
              <div className="text-lg font-semibold">{campaignGroup.total_page_views || 0}</div>
              <div className="text-xs text-purple-600">Page Views</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded border">
              <div className="text-lg font-semibold">{ctr}%</div>
              <div className="text-xs text-green-600">CTR</div>
            </div>
          </div>

          <Separator />

          {/* Ações */}
          <div className="flex gap-2">
            <Link 
              to={`/campanhas/${campaignGroup.id}/criativos`} 
              className="flex-1"
            >
              <Button className="w-full gap-2">
                <BarChart3 className="w-4 h-4" />
                Ver Criativos ({campaignGroup.campaigns_count || 0})
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

CampaignGroupCard.displayName = 'CampaignGroupCard';