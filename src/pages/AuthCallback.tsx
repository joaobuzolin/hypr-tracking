import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          setError('Erro ao autenticar. Tente novamente.');
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        if (session?.user) {
          const email = session.user.email || '';
          if (!email.toLowerCase().endsWith('@hypr.mobi')) {
            await supabase.auth.signOut();
            setError('Apenas contas @hypr.mobi podem acessar o sistema.');
            setTimeout(() => navigate('/auth'), 3000);
            return;
          }
          window.location.href = '/';
        } else {
          navigate('/auth');
        }
      } catch (err) {
        setError('Erro inesperado. Redirecionando...');
        setTimeout(() => navigate('/auth'), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {error ? (
          <div className="space-y-2">
            <p className="text-destructive font-medium">{error}</p>
            <p className="text-sm text-muted-foreground">Redirecionando...</p>
          </div>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Autenticando...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
