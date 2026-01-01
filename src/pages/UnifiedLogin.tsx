import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClientPortalAuth } from '@/hooks/useClientPortalAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { z } from 'zod';
import { Loader2, Dumbbell, Users, Calendar, TrendingUp, ArrowLeft, User, Lock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Trainer auth schemas
const authSchema = z.object({
  email: z.string().email({ message: 'Neplatná e-mailová adresa' }),
  password: z.string().min(6, { message: 'Heslo musí mít alespoň 6 znaků' }),
});

const emailSchema = z.object({
  email: z.string().email({ message: 'Neplatná e-mailová adresa' }),
});

const passwordSchema = z.object({
  password: z.string().min(6, { message: 'Heslo musí mít alespoň 6 znaků' }),
});

// Client auth schemas
const loginIdentifierSchema = z.string().min(1, 'Zadejte přihlašovací jméno');
const clientPasswordSchema = z.string().min(1, 'Zadejte heslo');

type AuthView = 'main' | 'forgot-password' | 'reset-password';

export default function UnifiedLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Trainer auth
  const { signIn, signUp, resetPassword, updatePassword, isAuthenticated: isTrainerAuth, loading: trainerAuthLoading } = useAuth();
  
  // Client auth
  const { isAuthenticated: isClientAuth, loading: clientAuthLoading } = useClientPortalAuth();
  
  // Determine initial mode from URL params or state
  const initialMode = searchParams.get('mode') === 'client' ? 'client' : 'trainer';
  const [userMode, setUserMode] = useState<'trainer' | 'client'>(initialMode);
  
  // Trainer state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [view, setView] = useState<AuthView>('main');
  
  // Client state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [clientLoading, setClientLoading] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  
  const redirectedRef = useRef(false);
  
  const clientFromPath = useMemo(() => {
    return (location.state as { from?: Location })?.from?.pathname || '/zona';
  }, [location.state]);

  // Check for password recovery redirect
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'recovery') {
      setView('reset-password');
      setUserMode('trainer');
    }
  }, [searchParams]);

  // Trainer redirect
  useEffect(() => {
    if (isTrainerAuth && !trainerAuthLoading && view !== 'reset-password' && userMode === 'trainer') {
      navigate('/', { replace: true });
    }
  }, [isTrainerAuth, trainerAuthLoading, navigate, view, userMode]);

  // Client redirect
  useEffect(() => {
    if (clientAuthLoading) return;
    if (!isClientAuth) return;
    if (redirectedRef.current) return;
    if (userMode !== 'client') return;

    redirectedRef.current = true;
    navigate(clientFromPath, { replace: true });
  }, [clientAuthLoading, isClientAuth, navigate, clientFromPath, userMode]);

  // Trainer form validation
  const validateForm = () => {
    const result = authSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const validateEmail = () => {
    const result = emailSchema.safeParse({ email });
    if (!result.success) {
      setErrors({ email: result.error.errors[0].message });
      return false;
    }
    setErrors({});
    return true;
  };

  const validatePassword = () => {
    const result = passwordSchema.safeParse({ password });
    if (!result.success) {
      setErrors({ password: result.error.errors[0].message });
      return false;
    }
    setErrors({});
    return true;
  };

  // Trainer handlers
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast({
          title: 'Chyba přihlášení',
          description: 'Nesprávný e-mail nebo heslo.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Chyba přihlášení',
          description: error.message,
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Přihlášení úspěšné',
        description: 'Vítejte zpět!',
      });
      navigate('/', { replace: true });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    const { data, error } = await signUp(email, password);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('User already registered')) {
        toast({
          title: 'Chyba registrace',
          description: 'Uživatel s tímto e-mailem již existuje.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Chyba registrace',
          description: error.message,
          variant: 'destructive',
        });
      }
    } else {
      try {
        await supabase.functions.invoke('notify-admin-new-user', {
          body: {
            userEmail: email,
            registeredAt: new Date().toISOString(),
          },
        });
      } catch (notifyError) {
        console.error('Failed to notify admin:', notifyError);
      }

      toast({
        title: 'Registrace úspěšná',
        description: 'Váš účet čeká na schválení administrátorem.',
      });
      navigate('/waiting-for-approval', { replace: true });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail()) return;

    setIsLoading(true);
    const { error } = await resetPassword(email);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Chyba',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'E-mail odeslán',
        description: 'Zkontrolujte svou e-mailovou schránku pro odkaz na obnovení hesla.',
      });
      setView('main');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword()) return;

    setIsLoading(true);
    const { error } = await updatePassword(password);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Chyba',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Heslo změněno',
        description: 'Vaše heslo bylo úspěšně změněno.',
      });
      navigate('/', { replace: true });
    }
  };

  // Client login handler
  const handleClientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);
    
    try {
      loginIdentifierSchema.parse(loginIdentifier);
      clientPasswordSchema.parse(clientPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setClientError(err.errors[0].message);
        return;
      }
    }

    setClientLoading(true);

    try {
      const trimmedIdentifier = loginIdentifier.trim();
      const trimmedPassword = clientPassword.trim();
      
      const { data, error: invokeError } = await supabase.functions.invoke('client-portal-login', {
        body: { loginIdentifier: trimmedIdentifier, password: trimmedPassword }
      });

      if (invokeError) {
        const status = (invokeError as any)?.context?.status as number | undefined;

        let payload: any = null;
        try {
          payload = await (invokeError as any)?.context?.json?.();
        } catch {
          // ignore JSON parse issues
        }

        if (payload?.code === 'RATE_LIMITED') {
          setRetryAfter(payload.retryAfterMinutes);
          setClientError(payload.error);
        } else if (payload?.code === 'ACCOUNT_DISABLED') {
          setClientError(payload.error);
        } else if (payload?.error) {
          setClientError(payload.error);
        } else if (status === 401) {
          setClientError('Neplatné přihlašovací údaje');
        } else {
          setClientError('Nepodařilo se připojit k serveru');
        }

        setClientLoading(false);
        return;
      }

      if (data?.error) {
        if (data.code === 'RATE_LIMITED') {
          setRetryAfter(data.retryAfterMinutes);
          setClientError(data.error);
        } else if (data.code === 'ACCOUNT_DISABLED') {
          setClientError(data.error);
        } else {
          setClientError(data.error);
        }
        setClientLoading(false);
        return;
      }

      if (data?.success && data.session) {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        if (setSessionError) {
          console.error('Failed to set session:', setSessionError);
          setClientError('Chyba při nastavení relace');
          setClientLoading(false);
          return;
        }

        sonnerToast.success('Úspěšně přihlášeno!');
        redirectedRef.current = true;
        navigate(clientFromPath, { replace: true });
      }
    } catch (err) {
      console.error('Login error:', err);
      setClientError('Neočekávaná chyba při přihlášení');
    } finally {
      setClientLoading(false);
    }
  };

  // Loading state
  if (trainerAuthLoading || clientAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const features = [
    { icon: Users, title: 'Správa klientů', desc: 'Evidujte své klienty a jejich pokroky' },
    { icon: Calendar, title: 'Plánování tréninků', desc: 'Organizujte svůj kalendář efektivně' },
    { icon: TrendingUp, title: 'Sledování výsledků', desc: 'Měření a diagnostika v jednom' },
  ];

  // Forgot password view
  if (view === 'forgot-password') {
    return (
      <div className="min-h-screen flex flex-col justify-center px-6 py-12 sm:px-8 bg-background">
        <div className="w-full max-w-sm mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
              <Dumbbell className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Obnovení hesla</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Zadejte svůj e-mail pro obnovení hesla
            </p>
          </div>

          <Card className="border-border/50 shadow-lg">
            <CardContent className="pt-6 pb-6">
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-sm">E-mail</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="vas@email.cz"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="h-11"
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>
                <Button type="submit" className="w-full h-11" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Odesílání...
                    </>
                  ) : (
                    'Odeslat odkaz pro obnovení'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setView('main')}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Zpět na přihlášení
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Reset password view (after clicking email link)
  if (view === 'reset-password') {
    return (
      <div className="min-h-screen flex flex-col justify-center px-6 py-12 sm:px-8 bg-background">
        <div className="w-full max-w-sm mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
              <Dumbbell className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Nové heslo</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Zadejte nové heslo pro svůj účet
            </p>
          </div>

          <Card className="border-border/50 shadow-lg">
            <CardContent className="pt-6 pb-6">
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-sm">Nové heslo</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-11"
                  />
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password}</p>
                  )}
                </div>
                <Button type="submit" className="w-full h-11" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ukládání...
                    </>
                  ) : (
                    'Změnit heslo'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left side - Branding (hidden on mobile, visible on lg+) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-gradient-to-br from-primary/20 via-background to-background p-12 flex-col justify-center items-center relative overflow-hidden">
        {/* Sharp geometric accent - Volt green */}
        <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_hsl(68_100%_50%/0.15),_transparent_50%)]" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        
        <div className="relative z-10 max-w-lg text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-xl bg-primary/20 border-2 border-primary/40 mb-8 shadow-volt">
            <Dumbbell className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl xl:text-5xl font-black text-foreground mb-4 tracking-tight">
            Just Move <span className="text-primary">Asistent</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-12 font-medium">
            {userMode === 'trainer' 
              ? 'Profesionální nástroj pro osobní trenéry'
              : 'Sledujte svůj pokrok a výsledky'}
          </p>
          
          {userMode === 'trainer' && (
            <div className="space-y-4">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-4 p-4 rounded-xl bg-card border border-primary/20 hover:border-primary/50 transition-all duration-150 shadow-lg hover:shadow-volt group"
                >
                  <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30 group-hover:bg-primary/30 transition-colors">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-8 lg:px-12 xl:px-16 relative">
        {/* Mobile top accent - Volt green */}
        <div className="lg:hidden absolute top-0 left-0 w-full h-1.5 bg-primary" />
        
        {/* Mobile header */}
        <div className="lg:hidden text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-xl bg-primary/20 border-2 border-primary/40 mb-4 shadow-volt">
            <Dumbbell className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-black text-foreground">Just Move <span className="text-primary">Asistent</span></h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            {userMode === 'trainer' 
              ? 'Profesionální nástroj pro osobní trenéry'
              : 'Klientský portál'}
          </p>
        </div>

        <div className="w-full max-w-sm mx-auto">
          {/* User mode tabs */}
          <div className="mb-6">
            <Tabs value={userMode} onValueChange={(v) => setUserMode(v as 'trainer' | 'client')}>
              <TabsList className="grid w-full grid-cols-2 h-12">
                <TabsTrigger value="trainer" className="text-sm font-bold gap-2">
                  <Users className="w-4 h-4" />
                  Jsem trenér
                </TabsTrigger>
                <TabsTrigger value="client" className="text-sm font-bold gap-2">
                  <User className="w-4 h-4" />
                  Jsem klient
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Trainer auth form */}
          {userMode === 'trainer' && (
            <Card className="border-2 border-border shadow-xl">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-xl text-center font-black tracking-tight">Trenér</CardTitle>
                <CardDescription className="text-center text-sm font-medium">
                  Přihlaste se nebo vytvořte nový účet
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-6">
                <Tabs defaultValue="signin" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6 h-11">
                    <TabsTrigger value="signin" className="text-sm font-bold">Přihlášení</TabsTrigger>
                    <TabsTrigger value="signup" className="text-sm font-bold">Registrace</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="signin" className="mt-0">
                    <form onSubmit={handleSignIn} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email" className="text-sm">E-mail</Label>
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="vas@email.cz"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isLoading}
                          className="h-11"
                        />
                        {errors.email && (
                          <p className="text-xs text-destructive">{errors.email}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="signin-password" className="text-sm">Heslo</Label>
                          <button
                            type="button"
                            onClick={() => setView('forgot-password')}
                            className="text-xs text-primary hover:text-primary/80 transition-colors"
                          >
                            Zapomenuté heslo?
                          </button>
                        </div>
                        <Input
                          id="signin-password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={isLoading}
                          className="h-11"
                        />
                        {errors.password && (
                          <p className="text-xs text-destructive">{errors.password}</p>
                        )}
                      </div>
                      <Button type="submit" className="w-full h-11" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Přihlašování...
                          </>
                        ) : (
                          'Přihlásit se'
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                  
                  <TabsContent value="signup" className="mt-0">
                    <form onSubmit={handleSignUp} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="text-sm">E-mail</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="vas@email.cz"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isLoading}
                          className="h-11"
                        />
                        {errors.email && (
                          <p className="text-xs text-destructive">{errors.email}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="text-sm">Heslo</Label>
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={isLoading}
                          className="h-11"
                        />
                        {errors.password && (
                          <p className="text-xs text-destructive">{errors.password}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Minimálně 6 znaků
                        </p>
                      </div>
                      <Button type="submit" className="w-full h-11" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Registrace...
                          </>
                        ) : (
                          'Vytvořit účet'
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Client auth form */}
          {userMode === 'client' && (
            <Card className="border-2 border-border shadow-xl">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-xl text-center font-black tracking-tight">Klient</CardTitle>
                <CardDescription className="text-center text-sm font-medium">
                  Přihlaste se do klientského portálu
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-6">
                <form onSubmit={handleClientLogin} className="space-y-5">
                  {clientError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{clientError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="client-identifier" className="text-sm flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      Přihlašovací jméno
                    </Label>
                    <Input
                      id="client-identifier"
                      type="text"
                      placeholder="vase_jmeno nebo email"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      className="h-11"
                      autoComplete="username"
                      disabled={clientLoading || !!retryAfter}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="client-password" className="text-sm flex items-center gap-2">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      Heslo
                    </Label>
                    <Input
                      id="client-password"
                      type="password"
                      placeholder="••••••••"
                      value={clientPassword}
                      onChange={(e) => setClientPassword(e.target.value)}
                      className="h-11"
                      autoComplete="current-password"
                      disabled={clientLoading || !!retryAfter}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-11"
                    disabled={clientLoading || !!retryAfter}
                  >
                    {clientLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Přihlašuji...
                      </>
                    ) : retryAfter ? (
                      `Zkuste za ${retryAfter} min`
                    ) : (
                      'Přihlásit se'
                    )}
                  </Button>

                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-center text-muted-foreground">
                      Přihlašovací údaje vám předal trenér.
                    </p>
                    <p className="text-xs text-center text-muted-foreground mt-1">
                      Nemáte přístup? Kontaktujte svého trenéra.
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
