import { useState } from 'react';
import { Pencil, Mail, Lock, Eye, EyeOff, Copy, Check, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EditCredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  currentEmail: string;
  currentPassword: string | null;
  onSuccess?: () => void;
}

// Generate secure password: 4 digits + 4 letters, shuffled
function generatePassword(): string {
  const digits = '0123456789';
  const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  const chars: string[] = [];
  
  for (let i = 0; i < 4; i++) {
    chars.push(digits[Math.floor(Math.random() * digits.length)]);
  }
  
  for (let i = 0; i < 4; i++) {
    chars.push(letters[Math.floor(Math.random() * letters.length)]);
  }
  
  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  
  return chars.join('');
}

export function EditCredentialsDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  currentEmail,
  currentPassword,
  onSuccess,
}: EditCredentialsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(currentEmail);
  const [password, setPassword] = useState(currentPassword || '');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const handleGeneratePassword = () => {
    setPassword(generatePassword());
    setShowPassword(true);
  };

  const handleCopyEmail = async () => {
    await navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    toast.success('Email zkopírován');
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyPassword = async () => {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopiedPassword(true);
    toast.success('Heslo zkopírováno');
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleSave = async () => {
    const emailChanged = email !== currentEmail;
    const passwordChanged = password !== currentPassword && password.length > 0;

    if (!emailChanged && !passwordChanged) {
      toast.info('Žádné změny k uložení');
      return;
    }

    if (emailChanged && !email.includes('@')) {
      toast.error('Zadejte platný email');
      return;
    }

    if (passwordChanged && password.length < 6) {
      toast.error('Heslo musí mít alespoň 6 znaků');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        'update-client-portal-credentials',
        {
          body: {
            client_id: clientId,
            new_email: emailChanged ? email : undefined,
            new_password: passwordChanged ? password : undefined,
          },
        }
      );

      if (error) {
        console.error('Update credentials error:', error);
        toast.error('Nepodařilo se uložit změny');
        return;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Přihlašovací údaje aktualizovány');
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Neočekávaná chyba');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail(currentEmail);
    setPassword(currentPassword || '');
    setShowPassword(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Upravit přihlašovací údaje
          </DialogTitle>
          <DialogDescription>
            Upravte email nebo heslo pro {clientName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email pro přihlášení
            </Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleCopyEmail}
              >
                {copiedEmail ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Heslo
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Zadejte nové heslo"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleCopyPassword}
                disabled={!password}
              >
                {copiedPassword ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={handleGeneratePassword}
            >
              <RefreshCw className="w-4 h-4" />
              Vygenerovat nové heslo
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Zrušit
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Ukládám...' : 'Uložit změny'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
