import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface CredentialsReminderDialogProps {
  open: boolean;
  loginCount: number;
  currentEmail: string | undefined;
  onSuccess: () => void;
  onSkip: () => void;
}

export function CredentialsReminderDialog({
  open,
  loginCount,
  currentEmail,
  onSuccess,
  onSkip,
}: CredentialsReminderDialogProps) {
  const [email, setEmail] = useState(currentEmail || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string }>({});

  const isLastReminder = loginCount >= 5;
  const remainingReminders = Math.max(0, 5 - loginCount);

  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    if (!email) {
      newErrors.email = 'Email je povinný';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Neplatný formát emailu';
    }

    if (!password) {
      newErrors.password = 'Heslo je povinné';
    } else if (password.length < 8) {
      newErrors.password = 'Heslo musí mít alespoň 8 znaků';
    }

    if (password !== confirmPassword) {
      newErrors.confirm = 'Hesla se neshodují';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('update-client-own-credentials', {
        body: {
          newEmail: email !== currentEmail ? email : undefined,
          newPassword: password,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Přihlašovací údaje byly úspěšně změněny!', {
        description: 'Od příštího přihlášení použijte nové údaje.',
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to update credentials:', error);
      toast.error('Nepodařilo se změnit údaje', {
        description: error instanceof Error ? error.message : 'Zkuste to prosím znovu',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <Shield className="w-8 h-8 text-primary" />
          </motion.div>
          <DialogTitle className="text-xl">Nastavte si vlastní přístupové údaje</DialogTitle>
          <DialogDescription className="text-center">
            Pro vaši bezpečnost a snadnější zapamatování si nastavte vlastní email a heslo.
          </DialogDescription>
        </DialogHeader>

        {isLastReminder && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Poslední výzva – pro pokračování je nutné nastavit vlastní údaje</span>
          </motion.div>
        )}

        {!isLastReminder && (
          <div className="text-center text-sm text-muted-foreground">
            Přihlášení {loginCount} z 5 • Zbývá {remainingReminders} {remainingReminders === 1 ? 'upozornění' : remainingReminders < 5 ? 'upozornění' : 'upozornění'}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Váš email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vas@email.cz"
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Nové heslo
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimálně 8 znaků"
                className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Potvrďte heslo
            </Label>
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Zopakujte heslo"
              className={errors.confirm ? 'border-destructive' : ''}
            />
            {errors.confirm && (
              <p className="text-sm text-destructive">{errors.confirm}</p>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Ukládám...' : 'Uložit nové údaje'}
            </Button>
            
            {!isLastReminder && (
              <Button
                type="button"
                variant="ghost"
                onClick={onSkip}
                disabled={loading}
                className="w-full text-muted-foreground"
              >
                Zatím přeskočit
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
