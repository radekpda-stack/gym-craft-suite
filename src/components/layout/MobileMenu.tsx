import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Stethoscope,
  Activity,
  Calendar,
  XCircle,
  Settings,
  LogOut,
  X,
  Zap,
  Sparkles,
  TrendingUp,
  Wallet,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { QuickCreditModal } from '@/components/credit/QuickCreditModal';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients', icon: Users, label: 'Klienti' },
  { to: '/trainings', icon: Dumbbell, label: 'Tréninky' },
  { to: '/progress', icon: TrendingUp, label: 'Progres' },
  { to: '/diagnostics', icon: Stethoscope, label: 'Diagnostika' },
  { to: '/measurements', icon: Activity, label: 'Měření' },
  { to: '/calendar', icon: Calendar, label: 'Kalendář' },
  { to: '/canceled', icon: XCircle, label: 'Zrušené tréninky' },
  { to: '/ai-assistant', icon: Sparkles, label: 'AI Asistent' },
  { to: '/settings', icon: Settings, label: 'Nastavení' },
];

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();
  const [quickCreditOpen, setQuickCreditOpen] = useState(false);

  const handleNavigation = (to: string) => {
    navigate(to);
    onClose();
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se odhlásit.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Odhlášení úspěšné',
        description: 'Byli jste odhlášeni.',
      });
      navigate('/auth', { replace: true });
    }
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-background/60 backdrop-blur-md md:hidden"
        onClick={onClose}
      />
      
      {/* Menu Panel - Apple-like slide panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[320px] bg-background/95 backdrop-blur-xl border-l border-border/50 shadow-2xl md:hidden animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">FitCoach</span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationCenter />
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl hover:bg-secondary/80 transition-colors touch-target active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-200px)]">
          {/* Quick Credit Button - Prominent */}
          <button
            onClick={() => setQuickCreditOpen(true)}
            className="w-full flex items-center justify-between px-4 py-4 rounded-2xl transition-all text-left bg-primary/10 hover:bg-primary/15 active:scale-[0.98] mb-3"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-primary/20">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <span className="font-semibold text-primary">Rychlý kredit</span>
            </div>
            <ChevronRight className="w-5 h-5 text-primary/60" />
          </button>

          {navItems.map((item) => {
            const isActive = location.pathname === item.to || 
              (item.to !== '/' && location.pathname.startsWith(item.to));
            const Icon = item.icon;

            return (
              <button
                key={item.to}
                onClick={() => handleNavigation(item.to)}
                className={cn(
                  'w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all text-left touch-target active:scale-[0.98]',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-foreground hover:bg-secondary/80'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                <span className={cn('font-medium', isActive && 'font-semibold')}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border/50 bg-background/95 backdrop-blur-xl safe-area-bottom">
          {user && (
            <p className="text-xs text-muted-foreground mb-3 truncate px-2">
              {user.email}
            </p>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all active:scale-[0.98] touch-target"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-semibold">Odhlásit se</span>
          </button>
        </div>
      </div>

      {/* Quick Credit Modal */}
      <QuickCreditModal 
        open={quickCreditOpen} 
        onOpenChange={setQuickCreditOpen}
        showTrigger={false}
      />
    </>
  );
}
