import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { HyprAdTrackLogo } from '@/components/HyprAdTrackLogo';

const Auth = () => {
  const { signInWithGoogle, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    window.location.href = '/';
    return null;
  }

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setError('Não foi possível iniciar o login com Google. Tente novamente.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center">
      {/* Background */}
      <img
        src="/lovable-uploads/d177fad6-08ba-4f61-b459-0f35fe3e81f4.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
        decoding="async"
        fetchPriority="high"
        width="1920"
        height="1080"
      />
      <div className="absolute inset-0 bg-black/40" />

      {/* Glass card */}
      <div className="relative z-10 w-full max-w-[380px] mx-4">
        <div
          className="rounded-2xl border border-white/[0.08] px-10 py-12 flex flex-col items-center"
          style={{
            background: 'rgba(12, 12, 14, 0.72)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
          }}
        >
          {/* Logo */}
          <div className="mb-10">
            <HyprAdTrackLogo height={34} variant="light" />
          </div>

          {/* Subtitle */}
          <div className="text-center mb-10">
            <p className="text-[13px] text-white/45 leading-relaxed">
              Acesso exclusivo para o time HYPR.
              <br />
              Faça login com sua conta @hypr.mobi
            </p>
          </div>

          {error && (
            <div className="w-full mb-8">
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
                <AlertDescription className="text-red-200 text-sm">{error}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Google button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-12 bg-white/[0.07] hover:bg-white/[0.12] active:bg-white/[0.05] border border-white/[0.10] rounded-xl flex items-center justify-center gap-2.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-10"
          >
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-[14px] font-medium text-white/85">
              {loading ? 'Conectando...' : 'Entrar com Google'}
            </span>
          </button>

          {/* Footer */}
          <p className="text-[11px] text-white/25">
            Apenas contas @hypr.mobi são permitidas.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
