import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { CampaignWithTags } from '@/hooks/useCampaigns';

interface CampaignCardProps {
  campaign: CampaignWithTags;
}

const calculateCTR = (clicks: number, pageViews: number) => {
  return pageViews > 0 ? ((clicks / pageViews) * 100).toFixed(2) : "0.00";
};

export const CampaignCard = memo(({ campaign }: CampaignCardProps) => {
  const { toast } = useToast();
  
  // Calculate CTR based on total clicks vs page views
  const totalClicks = campaign.metrics.cta_clicks + campaign.metrics.pin_clicks;
  const ctr = calculateCTR(totalClicks, campaign.metrics.page_views);
  
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${type} copiado para a área de transferência`,
    });
  };

  return (
    <Link to={`/campaigns/${campaign.id}`} className="block">
      <Card className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg font-semibold hover:text-blue-600 transition-colors">
                {campaign.name}
              </CardTitle>
              <CardDescription className="text-sm">{campaign.description}</CardDescription>
              {campaign.profile && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <span>Criado por: {campaign.profile.email}</span>
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                Criado em: {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
              </div>
            </div>
            <Badge variant={campaign.derivedStatus === 'active' ? 'default' : 'secondary'} className="text-xs">
              {campaign.derivedStatus === 'active' ? 'Ativa' : 'Pausada'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0" onClick={(e) => e.preventDefault()}>
          <div className="space-y-4">
            {/* Métricas simples */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-neutral-50 rounded border">
                <div className="text-lg font-semibold">{campaign.metrics.cta_clicks}</div>
                <div className="text-xs text-neutral-600">Click Button</div>
              </div>
              <div className="text-center p-3 bg-neutral-50 rounded border">
                <div className="text-lg font-semibold">{campaign.metrics.pin_clicks}</div>
                <div className="text-xs text-neutral-600">PIN Clicks</div>
              </div>
              <div className="text-center p-3 bg-neutral-50 rounded border">
                <div className="text-lg font-semibold">{ctr}%</div>
                <div className="text-xs text-neutral-600">CTR</div>
              </div>
            </div>

            <Separator />

            {/* Tags Preview */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Tags de Tracking</h4>
              
              {campaign.tags.length === 0 ? (
                <div className="text-xs text-muted-foreground p-3 bg-neutral-50 rounded border text-center">
                  Nenhuma tag criada. Clique na campanha para adicionar tags.
                </div>
              ) : (
                <div className="space-y-2">
                  {campaign.tags.slice(0, 2).map((tag) => (
                    <div key={tag.id} className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {tag.type.toUpperCase()}
                      </Badge>
                      <span className="text-xs font-medium">{tag.title}</span>
                      <code className="text-xs bg-neutral-100 px-2 py-1 rounded font-mono">
                        {tag.code}
                      </code>
                    </div>
                  ))}
                  {campaign.tags.length > 2 && (
                    <div className="text-xs text-muted-foreground">
                      +{campaign.tags.length - 2} tag{campaign.tags.length - 2 !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
});

CampaignCard.displayName = 'CampaignCard';