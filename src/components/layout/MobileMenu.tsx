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
  ShoppingBag,
  LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { QuickCreditModal } from '@/components/credit/QuickCreditModal';
import { Separator } from '@/components/ui/separator';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    label: 'Hlavní',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/calendar', icon: Calendar, label: 'Kalendář' },
      { to: '/trainings', icon: Dumbbell, label: 'Tréninky' },
      { to: '/clients', icon: Users, label: 'Klienti' },
    ],
  },
  {
    label: 'Klientská data',
    items: [
      { to: '/measurements', icon: Activity, label: 'Měření' },
      { to: '/progress', icon: TrendingUp, label: 'Progres' },
      { to: '/diagnostics', icon: Stethoscope, label: 'Diagnostika' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/sales', icon: ShoppingBag, label: 'Prodeje' },
    ],
  },
  {
    label: 'Nástroje',
    items: [
      { to: '/ai-assistant', icon: Sparkles, label: 'AI Asistent' },
    ],
  },
  {
    label: 'Systém',
    items: [
      { to: '/settings', icon: Settings, label: 'Nastavení' },
      { to: '/canceled', icon: XCircle, label: 'Zrušené tréninky' },
    ],
  },
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

  const isActive = (to: string) => {
    return location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-background/60 backdrop-blur-md lg:hidden"
        onClick={onClose}
      />
      
      {/* Menu Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[300px] bg-background/95 backdrop-blur-xl border-l border-border/30 shadow-2xl lg:hidden animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" strokeWidth={2} />
            </div>
            <span className="text-base font-bold tracking-tight">FitCoach</span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationCenter />
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-secondary/80 transition-colors touch-target active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-180px)]">
          {/* Quick Credit Button */}
          <button
            onClick={() => setQuickCreditOpen(true)}
            className="w-full flex items-center justify-between px-3 py-3 rounded-lg transition-all text-left bg-primary/10 hover:bg-primary/15 active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-primary/20">
                <Wallet className="w-4 h-4 text-primary" strokeWidth={1.5} />
              </div>
              <span className="text-sm font-semibold text-primary">Rychlý kredit</span>
            </div>
            <ChevronRight className="w-4 h-4 text-primary/60" />
          </button>

          <Separator className="bg-border/30" />

          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-1">
              <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                {section.label}
              </span>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.to);

                  return (
                    <button
                      key={item.to}
                      onClick={() => handleNavigation(item.to)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left touch-target active:scale-[0.98] relative',
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground/70 hover:bg-secondary/80 hover:text-foreground'
                      )}
                    >
                      {active && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
                      )}
                      <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.5} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
              {sectionIndex < sections.length - 1 && (
                <Separator className="mt-2 bg-border/30" />
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border/30 bg-background/95 backdrop-blur-xl safe-area-bottom">
          {user && (
            <p className="text-[11px] text-muted-foreground/50 mb-2 truncate px-1">
              {user.email}
            </p>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all active:scale-[0.98] touch-target"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
            <span className="text-sm font-medium">Odhlásit se</span>
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