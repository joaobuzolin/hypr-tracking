import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BarChart3, MousePointer, Target, FileText } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  // Mock data simulando métricas atuais
  const todayEvents = 45;
  const totalCampaigns = 2;
  const activeCampaigns = 1;
  
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
              <Button variant="outline" className="w-full sm:w-auto gap-2" disabled>
                <FileText className="w-4 h-4" />
                Ver Relatórios (Em breve)
              </Button>
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <MousePointer className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xl font-semibold">{todayEvents}</div>
                    <div className="text-sm text-neutral-600">Eventos Hoje</div>
                    <div className="text-xs text-green-600 mt-1">+12% vs ontem</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded">
                    <Target className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-xl font-semibold">98.2%</div>
                    <div className="text-sm text-neutral-600">Taxa de Entrega</div>
                    <Badge variant="outline" className="mt-1 text-xs bg-green-50 text-green-700">
                      Excelente
                    </Badge>
                  </div>
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
                  Crie campanhas e gere automaticamente tags exclusivas para CTA e PIN com apenas alguns cliques.
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
