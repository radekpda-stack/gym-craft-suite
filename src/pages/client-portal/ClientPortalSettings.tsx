import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Key, Lock, Save, CheckCircle2, AlertCircle, Users, Shield, Trophy, User, Palette, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useClientPortalAuth } from '@/hooks/useClientPortalAuth';
import { ClientPortalLayout } from '@/components/client-portal/ClientPortalLayout';
import { useClientPrivacySettings, useUpdateClientPrivacySettings } from '@/hooks/useClientPortalBenchmarks';
import { ClientProfileSection } from '@/components/client-portal/ClientProfileSection';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useLeaderboardSettings, useUpdateLeaderboardSettings } from '@/hooks/useClientGamification';
import { ThemeSwitcher } from '@/components/client-portal/common/SharedComponents';
import { useTheme } from 'next-themes';

export default function ClientPortalSettings() {
  const { user } = useClientPortalAuth();
  const { clientId } = useClientPortal();
  const { theme, setTheme } = useTheme();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Leaderboard settings
  const { data: leaderboardSettings, isLoading: leaderboardLoading } = useLeaderboardSettings(clientId ?? undefined);
  const updateLeaderboard = useUpdateLeaderboardSettings();
  const [nickname, setNickname] = useState('');
  
  // Initialize nickname from settings
  useEffect(() => {
    if (leaderboardSettings?.leaderboard_nickname) {
      setNickname(leaderboardSettings.leaderboard_nickname);
    }
  }, [leaderboardSettings]);

  const { data: privacySettings, isLoading: privacyLoading } = useClientPrivacySettings();
  const updatePrivacy = useUpdateClientPrivacySettings();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError('Heslo musí mít alespoň 8 znaků');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Hesla se neshodují');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError('Nepodařilo se změnit heslo');
        return;
      }

      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Heslo bylo změněno');
    } catch (err) {
      setError('Neočekávaná chyba');
    } finally {
      setLoading(false);
    }
  };

  const handlePrivacyToggle = (key: 'allow_anonymous_benchmarks' | 'allow_challenges_participation', value: boolean) => {
    updatePrivacy.mutate({ [key]: value }, {
      onSuccess: () => toast.success('Nastavení uloženo'),
      onError: () => toast.error('Nepodařilo se uložit nastavení'),
    });
  };

  const handleLeaderboardVisibility = (visible: boolean) => {
    if (!clientId) return;
    updateLeaderboard.mutate(
      { clientId, visible, nickname: nickname || 'Anonym' },
      {
        onSuccess: () => toast.success('Nastavení uloženo'),
        onError: () => toast.error('Nepodařilo se uložit'),
      }
    );
  };

  const handleNicknameChange = () => {
    if (!clientId) return;
    updateLeaderboard.mutate(
      { clientId, visible: leaderboardSettings?.leaderboard_visible ?? false, nickname: nickname || 'Anonym' },
      {
        onSuccess: () => toast.success('Přezdívka uložena'),
        onError: () => toast.error('Nepodařilo se uložit'),
      }
    );
  };

  return (
    <ClientPortalLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Key className="w-6 h-6" />
            Nastavení
          </h1>
          <p className="text-muted-foreground mt-1">Správa vašeho účtu a preferencí</p>
        </motion.div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profil</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Soukromí</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-2">
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">Účet</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <ClientProfileSection />
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Soukromí a srovnání
                  </CardTitle>
                  <CardDescription>
                    Nastavení viditelnosti v žebříčku a srovnání s ostatními
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(leaderboardLoading || privacyLoading) ? (
                    <div className="h-24 bg-muted animate-pulse rounded-lg" />
                  ) : (
                    <>
                      {/* Anonymity explanation */}
                      <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                        <p className="text-sm text-muted-foreground">
                          <Shield className="h-4 w-4 inline mr-1.5 text-primary" />
                          <strong>Ve výchozím nastavení jsi anonymní</strong> – tvoje jméno nikdo nevidí.
                        </p>
                      </div>

                      {/* Leaderboard visibility */}
                      <div className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex-1 pr-4">
                          <Label className="font-medium flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-primary" />
                            Zobrazit mě v žebříčku
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Ostatní uvidí tvou přezdívku místo anonymního označení
                          </p>
                        </div>
                        <Switch
                          checked={leaderboardSettings?.leaderboard_visible ?? false}
                          onCheckedChange={handleLeaderboardVisibility}
                          disabled={updateLeaderboard.isPending}
                        />
                      </div>

                      {(leaderboardSettings?.leaderboard_visible) && (
                        <div className="p-4 rounded-lg border space-y-3">
                          <div className="flex-1">
                            <Label className="font-medium">Moje přezdívka</Label>
                            <p className="text-sm text-muted-foreground">
                              Toto jméno uvidí ostatní
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Např. Silák, Běžec..."
                              value={nickname}
                              onChange={(e) => setNickname(e.target.value)}
                              className="flex-1"
                            />
                            <Button
                              variant="outline"
                              onClick={handleNicknameChange}
                              disabled={updateLeaderboard.isPending}
                            >
                              Uložit
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Anonymous benchmarks */}
                      <div className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex-1">
                          <Label className="font-medium">Porovnat mé výsledky</Label>
                          <p className="text-sm text-muted-foreground">
                            Anonymní srovnání s ostatními klienty
                          </p>
                        </div>
                        <Switch
                          checked={privacySettings?.allow_anonymous_benchmarks || false}
                          onCheckedChange={(checked) => handlePrivacyToggle('allow_anonymous_benchmarks', checked)}
                          disabled={updatePrivacy.isPending}
                        />
                      </div>

                      {/* Challenges participation */}
                      <div className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex-1">
                          <Label className="font-medium">Účast ve výzvách</Label>
                          <p className="text-sm text-muted-foreground">
                            Zapojit se do skupinových výzev
                          </p>
                        </div>
                        <Switch
                          checked={privacySettings?.allow_challenges_participation || false}
                          onCheckedChange={(checked) => handlePrivacyToggle('allow_challenges_participation', checked)}
                          disabled={updatePrivacy.isPending}
                        />
                      </div>

                      <p className="text-xs text-muted-foreground">
                        <Users className="h-3 w-3 inline mr-1" />
                        Srovnání je vždy anonymní. Nikdy nezobrazujeme tvoje jméno bez povolení.
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            {/* Appearance */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Vzhled
                  </CardTitle>
                  <CardDescription>
                    Přizpůsob si zobrazení aplikace
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Label>Barevný režim</Label>
                    <ThemeSwitcher 
                      value={(theme as 'light' | 'dark' | 'system') || 'system'} 
                      onChange={(t) => setTheme(t)} 
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Password */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Změna hesla
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    {success && (
                      <Alert className="bg-success/10 border-success text-success">
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertDescription>Heslo bylo změněno</AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" value={user?.email || ''} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Nové heslo</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        placeholder="Minimálně 8 znaků"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Potvrzení hesla</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Zadejte heslo znovu"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <Button type="submit" className="w-full gap-2" disabled={loading}>
                      <Save className="w-4 h-4" />
                      {loading ? 'Ukládám...' : 'Změnit heslo'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </ClientPortalLayout>
  );
}
