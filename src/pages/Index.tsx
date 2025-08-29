import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BarChart3, MousePointer, Target, FileText, Eye, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  // Mock data das campanhas (mesmo do arquivo Campaigns.tsx)
  const mockCampaigns = [
    {
      id: "1",
      name: "Campanha Black Friday",
      description: "Promoção especial para Black Friday",
      status: "active",
      start_date: "2024-01-15",
      end_date: "2024-02-15",
      created_at: "2024-01-10",
      metrics: {
        cta_clicks: 245,
        pin_clicks: 189,
        page_views: 8460,
        total_7d: 67
      }
    },
    {
      id: "2", 
      name: "Campanha Natal",
      description: "Campanha para período natalino",
      status: "paused",
      start_date: "2024-12-01",
      end_date: "2024-12-31",
      created_at: "2024-11-20",
      metrics: {
        cta_clicks: 156,
        pin_clicks: 98,
        page_views: 3420,
        total_7d: 23
      }
    }
  ];

  // Calcular totais agregados
  const totalCampaigns = mockCampaigns.length;
  const activeCampaigns = mockCampaigns.filter(c => c.status === 'active').length;
  const totalPageViews = mockCampaigns.reduce((sum, c) => sum + c.metrics.page_views, 0);
  const totalClickButtons = mockCampaigns.reduce((sum, c) => sum + c.metrics.cta_clicks, 0);
  const totalMapPins = mockCampaigns.reduce((sum, c) => sum + c.metrics.pin_clicks, 0);
  const totalClicks = totalClickButtons + totalMapPins;
  const overallCTR = totalPageViews > 0 ? ((totalClicks / totalPageViews) * 100).toFixed(2) : "0.00";
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header simples */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-3xl font-semibold text-foreground mb-3">
              Painel de Campanhas
            </h1>
            <p className="text-muted-foreground mb-6">
              Gere tags de eventos exclusivas, monitore cliques em CTAs e PINs, 
              e acompanhe o desempenho das suas campanhas.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/campaigns">
                <Button className="w-full sm:w-auto gap-2">
                  <Target className="w-4 h-4" />
                  Acessar Campanhas
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/reports">
                <Button variant="outline" className="w-full sm:w-auto gap-2">
                  <FileText className="w-4 h-4" />
                  Ver Relatórios
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Quick Stats */}
        <div className="mb-12">
          <div className="text-center mb-6">
            <h2 className="text-xl font-medium text-foreground mb-2">
              Resumo de Hoje
            </h2>
            <p className="text-sm text-muted-foreground">Acompanhe o desempenho em tempo real</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-neutral-100 rounded">
                    <BarChart3 className="w-5 h-5 text-neutral-600" />
                  </div>
                  <div>
                    <div className="text-xl font-semibold">{totalCampaigns}</div>
                    <div className="text-sm text-neutral-600">Campanhas</div>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {activeCampaigns} ativa{activeCampaigns !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded">
                    <Eye className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xl font-semibold">{totalPageViews.toLocaleString()}</div>
                    <div className="text-sm text-neutral-600">Page Views</div>
                    <div className="text-xs text-muted-foreground mt-1">Total de visualizações</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded">
                    <MousePointer className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-xl font-semibold">{totalClickButtons}</div>
                    <div className="text-sm text-neutral-600">Click Buttons</div>
                    <div className="text-xs text-muted-foreground mt-1">Cliques em botões</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded">
                    <MapPin className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-xl font-semibold">{totalMapPins}</div>
                    <div className="text-sm text-neutral-600">Map Pins</div>
                    <div className="text-xs text-muted-foreground mt-1">Cliques em pins</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded">
                    <Target className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-xl font-semibold">{overallCTR}%</div>
                    <div className="text-sm text-neutral-600">CTR Geral</div>
                    <Badge variant="outline" className="mt-1 text-xs bg-green-50 text-green-700">
                      {parseFloat(overallCTR) > 2 ? 'Excelente' : parseFloat(overallCTR) > 1 ? 'Bom' : 'Regular'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="mb-12">
          <div className="text-center mb-6">
            <h2 className="text-xl font-medium text-foreground mb-2">
              Performance Geral
            </h2>
            <p className="text-sm text-muted-foreground">Resumo consolidado de todas as campanhas ativas</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-6">
                <div className="text-center">
                  <Eye className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-blue-700 mb-1">{totalPageViews.toLocaleString()}</div>
                  <div className="text-sm text-blue-600 font-medium">Total de Page Views</div>
                  <div className="text-xs text-blue-500 mt-1">Base para cálculo do CTR</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="p-6">
                <div className="text-center">
                  <MousePointer className="w-8 h-8 text-green-600 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-green-700 mb-1">{totalClickButtons}</div>
                  <div className="text-sm text-green-600 font-medium">Click Buttons</div>
                  <div className="text-xs text-green-500 mt-1">Interações com botões</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
              <CardContent className="p-6">
                <div className="text-center">
                  <MapPin className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-purple-700 mb-1">{totalMapPins}</div>
                  <div className="text-sm text-purple-600 font-medium">Map Pins</div>
                  <div className="text-xs text-purple-500 mt-1">Cliques em localizações</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Features Overview */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-xl font-medium text-foreground mb-2">
              Como Funciona
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Sistema completo de tracking para campanhas com geração automática de tags e métricas detalhadas
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border shadow-sm">
              <CardHeader>
                <div className="w-10 h-10 bg-neutral-100 rounded flex items-center justify-center mb-3">
                  <Target className="w-5 h-5 text-neutral-600" />
                </div>
                <CardTitle className="text-base">Criação de Campanhas</CardTitle>
                <CardDescription className="text-sm">
                  Crie campanhas e gere automaticamente tags exclusivas para Click Buttons e PINs com apenas alguns cliques.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="border shadow-sm">
              <CardHeader>
                <div className="w-10 h-10 bg-blue-50 rounded flex items-center justify-center mb-3">
                  <MousePointer className="w-5 h-5 text-blue-600" />
                </div>
                <CardTitle className="text-base">Tracking em Tempo Real</CardTitle>
                <CardDescription className="text-sm">
                  Monitore cliques e eventos através de pixels e snippets JavaScript com métricas instantâneas.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="border shadow-sm">
              <CardHeader>
                <div className="w-10 h-10 bg-green-50 rounded flex items-center justify-center mb-3">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                </div>
                <CardTitle className="text-base">Analytics Avançado</CardTitle>
                <CardDescription className="text-sm">
                  Visualize métricas detalhadas, comparações temporais e relatórios de performance das campanhas.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="border shadow-sm">
              <CardHeader>
                <div className="w-10 h-10 bg-neutral-100 rounded flex items-center justify-center mb-3">
                  <FileText className="w-5 h-5 text-neutral-600" />
                </div>
                <CardTitle className="text-base">Relatórios Detalhados</CardTitle>
                <CardDescription className="text-sm">
                  Exporte dados em CSV/Excel e acompanhe disparos por dia com tabelas organizadas.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="border shadow-sm bg-neutral-50">
            <CardContent className="p-8">
              <h3 className="text-lg font-medium text-foreground mb-3">
                Pronto para começar?
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Configure suas primeiras campanhas de tracking e comece a monitorar seus resultados agora mesmo.
              </p>
              <Link to="/campaigns">
                <Button className="gap-2">
                  <Target className="w-4 h-4" />
                  Criar Primeira Campanha
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;