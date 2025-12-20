import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Calendar,
  Menu,
  CreditCard,
} from 'lucide-react';
import { useState } from 'react';
import { MobileMenu } from './MobileMenu';

const mainNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Domů' },
  { to: '/clients', icon: Users, label: 'Klienti' },
  { to: '/trainings', icon: Dumbbell, label: 'Tréninky' },
  { to: '/sales', icon: CreditCard, label: 'Prodej' },
  { to: '/calendar', icon: Calendar, label: 'Kalendář' },
];

export function MobileNav() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* Bottom Navigation Bar - Apple-like design */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        {/* Blur background */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t border-border/50" />
        
        {/* Safe area padding for iOS */}
        <div className="relative flex items-center justify-around h-[60px] px-1 safe-area-bottom">
          {mainNavItems.map((item) => {
            const isActive = location.pathname === item.to || 
              (item.to !== '/' && location.pathname.startsWith(item.to));
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 py-2 px-4 rounded-2xl transition-all touch-target',
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
                  'text-[10px] font-medium transition-colors',
                  isActive && 'font-semibold'
                )}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
          
          {/* Menu button */}
          <button
            onClick={() => setMenuOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 py-2 px-4 rounded-2xl transition-all touch-target',
              'active:scale-95 text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="p-1.5 rounded-xl">
              <Menu className="w-5 h-5" strokeWidth={2} />
            </div>
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
