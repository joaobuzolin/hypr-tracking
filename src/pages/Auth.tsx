import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { LogIn, UserPlus, Target, BarChart3, MousePointer, MapPin } from 'lucide-react';

const Auth = () => {
  const { signIn, signUp, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already logged in
  if (user) {
    window.location.href = '/';
    return null;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message || 'Erro ao fazer login');
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      setLoading(false);
      return;
    }

    const { error } = await signUp(email, password);
    
    if (error) {
      setError(error.message || 'Erro ao criar conta');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative flex">
      {/* Background image covering full screen */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat" 
        style={{backgroundImage: "url('/lovable-uploads/d177fad6-08ba-4f61-b459-0f35fe3e81f4.png')"}}
      >
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative z-10">
        <img 
          src="/lovable-uploads/6bbb35ef-f702-4718-b5c3-d8180d317be4.png" 
          alt="HYPR TRACKING" 
          className="h-8 object-contain"
        />
      </div>

      {/* Right side - Auth Forms with Glass Effect */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative z-10 backdrop-blur-sm bg-background/5 border-l border-white/5 shadow-2xl">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="lg:hidden w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-4 border border-white/20">
              <Target className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">
              HYPR Tracking
            </h2>
            <p className="text-sm text-white/80">
              Acesse sua conta para gerenciar campanhas
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="signin" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 bg-white/10 border border-white/20 backdrop-blur-sm">
              <TabsTrigger value="signin" className="flex items-center gap-2 text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">
                <LogIn className="w-4 h-4" />
                Entrar
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex items-center gap-2 text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">
                <UserPlus className="w-4 h-4" />
                Cadastrar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <Card className="bg-white/10 border border-white/20 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Fazer Login</CardTitle>
                  <CardDescription className="text-white/80">
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email" className="text-white">Email</Label>
                      <Input
                        id="signin-email"
                        name="email"
                        type="email"
                        placeholder="seu-email@hypr.mobi"
                        required
                        disabled={loading}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password" className="text-white">Senha</Label>
                      <Input
                        id="signin-password"
                        name="password"
                        type="password"
                        placeholder="Digite sua senha"
                        required
                        disabled={loading}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                      />
                    </div>
                    <Button type="submit" className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30" disabled={loading}>
                      {loading ? 'Entrando...' : 'Entrar'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signup">
              <Card className="bg-white/10 border border-white/20 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Criar Conta</CardTitle>
                  <CardDescription className="text-white/80">
                    Cadastre-se com seu email @hypr.mobi
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-white">Email</Label>
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        placeholder="seu-email@hypr.mobi"
                        required
                        disabled={loading}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-white">Senha</Label>
                      <Input
                        id="signup-password"
                        name="password"
                        type="password"
                        placeholder="Digite sua senha (min. 6 caracteres)"
                        required
                        disabled={loading}
                        minLength={6}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm-password" className="text-white">Confirmar Senha</Label>
                      <Input
                        id="signup-confirm-password"
                        name="confirmPassword"
                        type="password"
                        placeholder="Confirme sua senha"
                        required
                        disabled={loading}
                        minLength={6}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                      />
                    </div>
                    <Button type="submit" className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30" disabled={loading}>
                      {loading ? 'Criando conta...' : 'Criar Conta'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="text-center">
            <Separator className="mb-4 bg-white/20" />
            <p className="text-xs text-white/70">
              Apenas colaboradores HYPR com email @hypr.mobi podem acessar o sistema
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;