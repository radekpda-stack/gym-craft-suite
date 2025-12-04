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
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients', icon: Users, label: 'Klienti' },
  { to: '/trainings', icon: Dumbbell, label: 'Tréninky' },
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
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden"
        onClick={onClose}
      />
      
      {/* Menu Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xs bg-background border-l border-border shadow-xl md:hidden animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">FitCoach</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)]">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to || 
              (item.to !== '/' && location.pathname.startsWith(item.to));
            const Icon = item.icon;

            return (
              <button
                key={item.to}
                onClick={() => handleNavigation(item.to)}
                className={cn(
                  'w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all text-left',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-secondary'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-background">
          {user && (
            <p className="text-xs text-muted-foreground mb-3 truncate px-2">
              {user.email}
            </p>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Odhlásit se</span>
          </button>
        </div>
      </div>
    </>
  );
}
