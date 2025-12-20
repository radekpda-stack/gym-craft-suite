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
      {/* Gradient shadow above nav */}
      <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
      
      {/* Glass background */}
      <div className="absolute inset-0 bg-card/95 backdrop-blur-2xl border-t border-border/30 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]" />
      
      {/* Scrollable container */}
      <div className="relative flex items-center h-[72px] px-2 safe-area-bottom overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1 mx-auto">
          {mainNavItems.map((item) => {
            const isActive = location.pathname === item.to || 
              (item.to !== '/' && location.pathname.startsWith(item.to));
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'relative flex flex-col items-center justify-center min-w-[56px] py-1.5 px-2 rounded-2xl transition-all duration-200 touch-target flex-shrink-0',
                  'active:scale-90',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground/70 hover:text-foreground'
                )}
              >
                {/* Active indicator pill */}
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-primary" />
                )}
                
                {/* Icon container */}
                <div className={cn(
                  'relative flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-200',
                  isActive 
                    ? 'bg-primary/15 shadow-sm' 
                    : 'hover:bg-secondary/50'
                )}>
                  <Icon 
                    className={cn(
                      'w-[22px] h-[22px] transition-all duration-200',
                      isActive && 'scale-110'
                    )} 
                    strokeWidth={isActive ? 2.5 : 1.8} 
                  />
                </div>
                
                {/* Label */}
                <span className={cn(
                  'text-[9px] mt-0.5 transition-all duration-200 whitespace-nowrap',
                  isActive 
                    ? 'font-bold text-primary' 
                    : 'font-medium'
                )}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
