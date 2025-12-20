import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Calendar,
  CreditCard,
  Activity,
  ClipboardList,
  Bell,
  Settings,
} from 'lucide-react';

const mainNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Domů' },
  { to: '/clients', icon: Users, label: 'Klienti' },
  { to: '/trainings', icon: Dumbbell, label: 'Tréninky' },
  { to: '/sales', icon: CreditCard, label: 'Prodej' },
  { to: '/calendar', icon: Calendar, label: 'Kalendář' },
  { to: '/records', icon: Activity, label: 'Záznamy' },
  { to: '/training-plans', icon: ClipboardList, label: 'Plány' },
  { to: '/reminders', icon: Bell, label: 'Připomínky' },
  { to: '/settings', icon: Settings, label: 'Nastavení' },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      {/* Blur background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t border-border/50" />
      
      {/* Safe area padding for iOS - scrollable */}
      <div className="relative flex items-center gap-1 h-[60px] px-2 safe-area-bottom overflow-x-auto scrollbar-hide">
        {mainNavItems.map((item) => {
          const isActive = location.pathname === item.to || 
            (item.to !== '/' && location.pathname.startsWith(item.to));
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-2xl transition-all touch-target flex-shrink-0',
                'active:scale-95',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn(
                'p-1.5 rounded-xl transition-colors',
                isActive && 'bg-primary/10'
              )}>
                <Icon className={cn(
                  'w-5 h-5 transition-transform',
                  isActive && 'scale-105'
                )} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                'text-[10px] font-medium transition-colors whitespace-nowrap',
                isActive && 'font-semibold'
              )}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
