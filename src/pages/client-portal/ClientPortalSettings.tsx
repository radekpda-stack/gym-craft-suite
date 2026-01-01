import { useState } from 'react';
import { motion } from 'framer-motion';
import { Key, Lock, Save, CheckCircle2, AlertCircle, Users, Shield, Bell, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useClientPortalAuth } from '@/hooks/useClientPortalAuth';
import { ClientPortalLayout } from '@/components/client-portal/ClientPortalLayout';
import { useClientPrivacySettings, useUpdateClientPrivacySettings } from '@/hooks/useClientPortalBenchmarks';
import { useClientPreferences } from '@/hooks/useClientPreferences';
import { ClientProfileSection } from '@/components/client-portal/ClientProfileSection';

export default function ClientPortalSettings() {
  const { user } = useClientPortalAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { data: privacySettings, isLoading: privacyLoading } = useClientPrivacySettings();
  const updatePrivacy = useUpdateClientPrivacySettings();
  const { preferences, updatePreferences, isUpdating } = useClientPreferences();

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

  const handlePreferenceChange = (key: string, value: any) => {
    updatePreferences({ [key]: value }, {
      onSuccess: () => toast.success('Nastavení uloženo'),
      onError: () => toast.error('Nepodařilo se uložit'),
    });
  };

  return (
    <ClientPortalLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Key className="w-6 h-6" />
            Nastavení
          </h1>
          <p className="text-muted-foreground mt-1">Správa vašeho účtu</p>
        </motion.div>

        {/* My Profile */}
        <ClientProfileSection />

        {/* Privacy & Benchmarks */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Soukromí & srovnání
              </CardTitle>
              <CardDescription>
                Nastavení anonymního srovnání s ostatními klienty
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {privacyLoading ? (
                <div className="h-24 bg-muted animate-pulse rounded-lg" />
              ) : (
                <>
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex-1">
                      <Label className="font-medium">Anonymní srovnání výkonu</Label>
                      <p className="text-sm text-muted-foreground">
                        Povolit anonymní srovnání tvých výsledků s ostatními klienty
                      </p>
                    </div>
                    <Switch
                      checked={privacySettings?.allow_anonymous_benchmarks || false}
                      onCheckedChange={(checked) => handlePrivacyToggle('allow_anonymous_benchmarks', checked)}
                      disabled={updatePrivacy.isPending}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex-1">
                      <Label className="font-medium">Účast ve výzvách</Label>
                      <p className="text-sm text-muted-foreground">
                        Zobrazení v anonymním žebříčku jako "Athlete #X"
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
                    Nikdy nezobrazujeme jméno. Srovnání je vždy anonymní. Žebříček se zobrazí od 8 účastníků.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Notifications */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifikace
              </CardTitle>
              <CardDescription>Upozornění a připomínky</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { key: 'notify_water_reminder', label: 'Připomínka pitného režimu' },
                { key: 'notify_campaign_reminder', label: 'Připomínka kampaně (strava)' },
                { key: 'notify_new_challenge', label: 'Nová výzva' },
                { key: 'notify_low_credit', label: 'Upozornění na nízký kredit' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg border">
                  <Label className="font-medium">{label}</Label>
                  <Switch
                    checked={(preferences as any)?.[key] || false}
                    onCheckedChange={(checked) => handlePreferenceChange(key, checked)}
                    disabled={isUpdating}
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Notifikace budou dostupné v příští verzi aplikace.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Units */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ruler className="w-5 h-5" />
                Jednotky
              </CardTitle>
              <CardDescription>Preferované jednotky měření</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Váha</Label>
                  <Select
                    value={preferences?.weight_unit || 'kg'}
                    onValueChange={(v) => handlePreferenceChange('weight_unit', v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="lb">lb</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Vzdálenost</Label>
                  <Select
                    value={preferences?.distance_unit || 'km'}
                    onValueChange={(v) => handlePreferenceChange('distance_unit', v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="km">km</SelectItem>
                      <SelectItem value="mi">mi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Formát času</Label>
                  <Select
                    value={preferences?.time_format || 'mm:ss'}
                    onValueChange={(v) => handlePreferenceChange('time_format', v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mm:ss">mm:ss</SelectItem>
                      <SelectItem value="hh:mm:ss">hh:mm:ss</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Password */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
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
      </div>
    </ClientPortalLayout>
  );
}
