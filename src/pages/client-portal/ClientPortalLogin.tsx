import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClientPortalAuth } from '@/hooks/useClientPortalAuth';
import { toast } from 'sonner';
import { z } from 'zod';

const emailSchema = z.string().email('Zadejte platný email');
const passwordSchema = z.string().min(6, 'Heslo musí mít alespoň 6 znaků');

export default function ClientPortalLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithMagicLink, signIn, isAuthenticated } = useClientPortalAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    const from = (location.state as { from?: Location })?.from?.pathname || '/client';
    navigate(from, { replace: true });
    return null;
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setLoading(true);
    const { error } = await signInWithMagicLink(email);
    setLoading(false);

    if (error) {
      toast.error('Nepodařilo se odeslat odkaz. Zkuste to znovu.');
      return;
    }

    setMagicLinkSent(true);
    toast.success('Odkaz odeslán na váš email!');
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      toast.error('Neplatné přihlašovací údaje');
      return;
    }

    const from = (location.state as { from?: Location })?.from?.pathname || '/client';
    navigate(from, { replace: true });
  };

  if (magicLinkSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="border-0 shadow-2xl bg-card/80 backdrop-blur">
            <CardContent className="pt-12 pb-8 px-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="w-8 h-8 text-success" />
              </motion.div>
              
              <h2 className="text-2xl font-bold mb-2">Zkontrolujte svůj email</h2>
              <p className="text-muted-foreground mb-6">
                Odeslali jsme vám přihlašovací odkaz na<br />
                <span className="font-medium text-foreground">{email}</span>
              </p>
              
              <p className="text-sm text-muted-foreground">
                Klikněte na odkaz v emailu pro přihlášení do portálu.
              </p>

              <Button
                variant="ghost"
                className="mt-6"
                onClick={() => setMagicLinkSent(false)}
              >
                Použít jiný email
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

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
            <Tabs defaultValue="magic" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="magic" className="gap-2">
                  <Mail className="w-4 h-4" />
                  Magic Link
                </TabsTrigger>
                <TabsTrigger value="password" className="gap-2">
                  <Lock className="w-4 h-4" />
                  Heslo
                </TabsTrigger>
              </TabsList>

              <TabsContent value="magic">
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      placeholder="vas@email.cz"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12"
                      autoComplete="email"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 gap-2"
                    disabled={loading}
                  >
                    {loading ? 'Odesílám...' : 'Odeslat přihlašovací odkaz'}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </form>

                <p className="text-xs text-center text-muted-foreground mt-4">
                  Zašleme vám jednorázový odkaz pro bezpečné přihlášení bez hesla.
                </p>
              </TabsContent>

              <TabsContent value="password">
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      placeholder="vas@email.cz"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12"
                      autoComplete="email"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Heslo</label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12"
                      autoComplete="current-password"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 gap-2"
                    disabled={loading}
                  >
                    {loading ? 'Přihlašuji...' : 'Přihlásit se'}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Nemáte přístup? Kontaktujte svého trenéra.
        </p>
      </motion.div>
    </div>
  );
}
