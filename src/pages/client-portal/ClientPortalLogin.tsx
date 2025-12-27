import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, User, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useClientPortalAuth } from '@/hooks/useClientPortalAuth';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const loginIdentifierSchema = z.string().min(1, 'Zadejte přihlašovací jméno');
const passwordSchema = z.string().min(1, 'Zadejte heslo');

export default function ClientPortalLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading: authLoading } = useClientPortalAuth();

  const fromPath = useMemo(() => {
    return (location.state as { from?: Location })?.from?.pathname || '/client';
  }, [location.state]);

  const redirectedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;
    if (redirectedRef.current) return;

    redirectedRef.current = true;
    navigate(fromPath, { replace: true });
  }, [authLoading, isAuthenticated, navigate, fromPath]);
  
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  // Show loading while auth state is being determined
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Ověřuji přihlášení...</p>
        </motion.div>
      </div>
    );
  }

  // If already authenticated, wait for useEffect redirect
  if (isAuthenticated) {
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      loginIdentifierSchema.parse(loginIdentifier);
      passwordSchema.parse(password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    setLoading(true);

    try {
      const trimmedIdentifier = loginIdentifier.trim();
      const trimmedPassword = password.trim();
      
      const { data, error: invokeError } = await supabase.functions.invoke('client-portal-login', {
        body: { loginIdentifier: trimmedIdentifier, password: trimmedPassword }
      });

      if (invokeError) {
        // Supabase returns invokeError for non-2xx responses too (e.g., 401), not only for network failures.
        const status = (invokeError as any)?.context?.status as number | undefined;

        let payload: any = null;
        try {
          payload = await (invokeError as any)?.context?.json?.();
        } catch {
          // ignore JSON parse issues
        }

        if (payload?.code === 'RATE_LIMITED') {
          setRetryAfter(payload.retryAfterMinutes);
          setError(payload.error);
        } else if (payload?.code === 'ACCOUNT_DISABLED') {
          setError(payload.error);
        } else if (payload?.error) {
          setError(payload.error);
        } else if (status === 401) {
          setError('Neplatné přihlašovací údaje');
        } else {
          setError('Nepodařilo se připojit k serveru');
        }

        setLoading(false);
        return;
      }

      if (data?.error) {
        if (data.code === 'RATE_LIMITED') {
          setRetryAfter(data.retryAfterMinutes);
          setError(data.error);
        } else if (data.code === 'ACCOUNT_DISABLED') {
          setError(data.error);
        } else {
          setError(data.error);
        }
        setLoading(false);
        return;
      }

      if (data?.success && data.session) {
        // Set the Supabase session
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        if (setSessionError) {
          console.error('Failed to set session:', setSessionError);
          setError('Chyba při nastavení relace');
          setLoading(false);
          return;
        }

        toast.success('Úspěšně přihlášeno!');
        redirectedRef.current = true;
        navigate(fromPath, { replace: true });
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Neočekávaná chyba při přihlášení');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20"
          >
            <span className="text-2xl font-bold text-primary-foreground">JM</span>
          </motion.div>
          <h1 className="text-3xl font-bold">Just Move</h1>
          <p className="text-muted-foreground mt-1">Klientský portál</p>
        </div>

        <Card className="border-0 shadow-2xl bg-card/80 backdrop-blur">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Přihlášení</CardTitle>
            <CardDescription>
              Přihlaste se pro zobrazení vašeho pokroku
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  Přihlašovací jméno
                </label>
                <Input
                  type="text"
                  placeholder="vase_jmeno"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="h-12"
                  autoComplete="username"
                  disabled={loading || !!retryAfter}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  Heslo
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12"
                  autoComplete="current-password"
                  disabled={loading || !!retryAfter}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 gap-2"
                disabled={loading || !!retryAfter}
              >
                {loading ? 'Přihlašuji...' : retryAfter ? `Zkuste za ${retryAfter} min` : 'Přihlásit se'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-center text-muted-foreground">
                Přihlašovací údaje vám předal trenér.
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Nemáte přístup? Kontaktujte svého trenéra.
        </p>
      </motion.div>
    </div>
  );
}
