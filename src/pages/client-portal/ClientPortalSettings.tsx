import { useState } from 'react';
import { motion } from 'framer-motion';
import { Key, Lock, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useClientPortalAuth } from '@/hooks/useClientPortalAuth';
import { ClientPortalLayout } from '@/components/client-portal/ClientPortalLayout';

export default function ClientPortalSettings() {
  const { user } = useClientPortalAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
        console.error('Password update error:', updateError);
        setError('Nepodařilo se změnit heslo');
        return;
      }

      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Heslo bylo změněno');
    } catch (err) {
      console.error('Password change error:', err);
      setError('Neočekávaná chyba');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClientPortalLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Key className="w-6 h-6" />
            Nastavení
          </h1>
          <p className="text-muted-foreground mt-1">
            Správa vašeho účtu
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Změna hesla
              </CardTitle>
              <CardDescription>
                Změňte si heslo pro přihlášení do portálu
              </CardDescription>
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
                    <AlertDescription>
                      Heslo bylo úspěšně změněno
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
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
                  <p className="text-xs text-muted-foreground">
                    Doporučujeme alespoň 10 znaků s kombinací písmen a čísel
                  </p>
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
