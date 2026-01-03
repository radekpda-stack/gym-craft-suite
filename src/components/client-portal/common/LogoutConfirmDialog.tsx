import { useState } from 'react';
import { LogOut } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LogoutConfirmDialogProps {
  onConfirm: () => void;
  children?: React.ReactNode;
  className?: string;
  variant?: 'icon' | 'button';
}

/**
 * Logout confirmation dialog with customizable trigger
 */
export function LogoutConfirmDialog({ 
  onConfirm, 
  children,
  className,
  variant = 'icon'
}: LogoutConfirmDialogProps) {
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    setOpen(false);
    onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {children || (
          variant === 'icon' ? (
            <button 
              className={cn(
                "p-2 text-muted-foreground hover:text-foreground transition-colors",
                className
              )}
            >
              <LogOut className="w-5 h-5" />
            </button>
          ) : (
            <Button variant="outline" className={cn("gap-2", className)}>
              <LogOut className="w-4 h-4" />
              Odhlásit se
            </Button>
          )
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Odhlásit se?</AlertDialogTitle>
          <AlertDialogDescription>
            Opravdu se chceš odhlásit z klientského portálu?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Zrušit</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            Odhlásit
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
