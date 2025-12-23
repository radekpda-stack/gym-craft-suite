import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/lib/i18n';
import { Eye, EyeOff, Lock, Check } from 'lucide-react';
import { z } from 'zod';

const passwordSchema = z.object({
  newPassword: z.string().min(6, 'Heslo musí mít alespoň 6 znaků'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Hesla se neshodují',
  path: ['confirmPassword'],
});

export function PasswordChangeSettings() {
  const { language } = useLanguage();
  const { updatePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = passwordSchema.safeParse({ newPassword, confirmPassword });
    
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await updatePassword(newPassword);
      
      if (error) {
        toast.error(language === 'cs' ? 'Chyba při změně hesla' : 'Error changing password', {
          description: error.message,
        });
      } else {
        toast.success(language === 'cs' ? 'Heslo bylo úspěšně změněno' : 'Password changed successfully');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      toast.error(language === 'cs' ? 'Neočekávaná chyba' : 'Unexpected error');
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = newPassword.length >= 6 && newPassword === confirmPassword;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-password">
          {language === 'cs' ? 'Nové heslo' : 'New password'}
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="new-password"
            type={showNewPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={language === 'cs' ? 'Zadejte nové heslo' : 'Enter new password'}
            className="pl-10 pr-10"
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {newPassword.length > 0 && newPassword.length < 6 && (
          <p className="text-xs text-destructive">
            {language === 'cs' ? 'Heslo musí mít alespoň 6 znaků' : 'Password must be at least 6 characters'}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">
          {language === 'cs' ? 'Potvrďte heslo' : 'Confirm password'}
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={language === 'cs' ? 'Zadejte heslo znovu' : 'Enter password again'}
            className="pl-10 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {confirmPassword.length > 0 && newPassword !== confirmPassword && (
          <p className="text-xs text-destructive">
            {language === 'cs' ? 'Hesla se neshodují' : 'Passwords do not match'}
          </p>
        )}
        {confirmPassword.length > 0 && newPassword === confirmPassword && newPassword.length >= 6 && (
          <p className="text-xs text-green-500 flex items-center gap-1">
            <Check className="w-3 h-3" />
            {language === 'cs' ? 'Hesla se shodují' : 'Passwords match'}
          </p>
        )}
      </div>

      <Button 
        type="submit" 
        disabled={!isValid || isLoading}
        className="w-full"
      >
        {isLoading 
          ? (language === 'cs' ? 'Ukládám...' : 'Saving...') 
          : (language === 'cs' ? 'Změnit heslo' : 'Change password')
        }
      </Button>
    </form>
  );
}
