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
    <Link to={`/criativos/${campaign.id}`} className="block group">
      <Card className="border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer h-full group-hover:scale-[1.02] gpu-accelerated section-surface">
        <CardHeader className="pb-2 px-3 md:px-4 py-3 md:py-4">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 lg:gap-3">
            <div className="flex-1 min-w-0">
              {/* Campaign Group and Insertion Order Info - optimized */}
              {(campaign.campaign_group || campaign.insertion_order) && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {campaign.campaign_group && (
                    <Badge variant="outline" className="text-xs">
                      {campaign.campaign_group.name.length > 20 
                        ? `${campaign.campaign_group.name.slice(0, 20)}...` 
                        : campaign.campaign_group.name}
                    </Badge>
                  )}
                  {campaign.insertion_order && (
                    <Badge variant="outline" className="text-xs">
                      {campaign.insertion_order.client_name.length > 20 
                        ? `${campaign.insertion_order.client_name.slice(0, 20)}...` 
                        : campaign.insertion_order.client_name}
                    </Badge>
                  )}
                </div>
              )}
              <CardTitle className="text-sm md:text-base lg:text-lg font-semibold hover:text-blue-600 transition-colors break-words leading-tight">
                {campaign.name}
              </CardTitle>
              {campaign.description && (
                <CardDescription className="text-xs md:text-sm break-words line-clamp-2">{campaign.description}</CardDescription>
              )}
              {campaign.profile && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <span className="break-all">Criado por: {campaign.profile.email}</span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
                <div className="text-xs text-muted-foreground">
                  Criado em: {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
                </div>
                {campaign.creative_format && (
                  <Badge variant="outline" className="text-xs w-fit">
                    {campaign.creative_format}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1 items-end">
              <Badge variant={campaign.derivedStatus === 'active' ? 'default' : 'secondary'} className="text-xs shrink-0">
                {campaign.derivedStatus === 'active' ? 'Ativa' : 'Inativa'}
              </Badge>
              <Badge 
                variant="outline" 
                className={`text-xs shrink-0 ${
                  campaign.metrics.last_hour > 0 
                    ? 'bg-green-50 text-green-700 border-green-200' 
                    : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                }`}
              >
                Últ. hora: {campaign.metrics.last_hour}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-3 md:px-4 pb-3 md:pb-4" onClick={(e) => e.preventDefault()}>
          <div className="space-y-2 md:space-y-3">
            {/* Métricas responsivas - stack no mobile, grid no desktop */}
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1.5 md:gap-2">
              <div className="flex justify-between items-center sm:flex-col sm:text-center p-2 bg-background rounded border touch-target">
                <div className="sm:hidden text-xs text-muted-foreground">Click Button</div>
                <div className="text-sm md:text-base lg:text-lg font-semibold">{campaign.metrics.cta_clicks}</div>
                <div className="hidden sm:block text-xs text-muted-foreground">Click Button</div>
              </div>
              <div className="flex justify-between items-center sm:flex-col sm:text-center p-2 bg-background rounded border touch-target">
                <div className="sm:hidden text-xs text-muted-foreground">PIN Clicks</div>
                <div className="text-sm md:text-base lg:text-lg font-semibold">{campaign.metrics.pin_clicks}</div>
                <div className="hidden sm:block text-xs text-muted-foreground">PIN Clicks</div>
              </div>
              <div className="flex justify-between items-center sm:flex-col sm:text-center p-2 bg-background rounded border touch-target">
                <div className="sm:hidden text-xs text-muted-foreground">CTR</div>
                <div className="text-sm md:text-base lg:text-lg font-semibold">{ctr}%</div>
                <div className="hidden sm:block text-xs text-muted-foreground">CTR</div>
              </div>
            </div>

            <Separator />

            {/* Tags Preview - optimized spacing */}
            <div className="space-y-2">
              <h4 className="font-medium text-xs md:text-sm">Tags de Tracking</h4>
              
              {campaign.tags.length === 0 ? (
                <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded border text-center">
                  Nenhuma tag criada. Clique na campanha para adicionar tags.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {campaign.tags.slice(0, 2).map((tag) => (
                    <div key={tag.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-xs">
                          {tag.type.toUpperCase()}
                        </Badge>
                        <span className="text-xs font-medium break-words line-clamp-1">{tag.title}</span>
                      </div>
                      <code className="text-xs bg-muted px-1.5 py-1 rounded font-mono break-all line-clamp-1">
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