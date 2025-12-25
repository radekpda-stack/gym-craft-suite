import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useClientPortalAuth } from '@/hooks/useClientPortalAuth';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const emailSchema = z.string().email('Zadejte platný email');
const passwordSchema = z.string().min(1, 'Zadejte heslo');

export default function ClientPortalLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useClientPortalAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  // Redirect if already authenticated
  if (isAuthenticated) {
    const from = (location.state as { from?: Location })?.from?.pathname || '/client';
    navigate(from, { replace: true });
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    setLoading(true);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('client-portal-login', {
        body: { email, password }
      });

      if (invokeError) {
        console.error('Login invoke error:', invokeError);
        setError('Nepodařilo se připojit k serveru');
        setLoading(false);
        return;
      }

      if (data.error) {
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

      if (data.success && data.session) {
        // Set the session in supabase client
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        toast.success('Úspěšně přihlášeno!');
        
        const from = (location.state as { from?: Location })?.from?.pathname || '/client';
        navigate(from, { replace: true });
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
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="vas@email.cz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12"
                  autoComplete="email"
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
