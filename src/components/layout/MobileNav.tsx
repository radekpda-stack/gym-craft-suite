import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  ShoppingCart,
  MoreHorizontal,
} from 'lucide-react';
import { MobileMenu } from './MobileMenu';

const mainNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Přehled' },
  { to: '/schedule', icon: CalendarDays, label: 'Rozvrh' },
  { to: '/clients', icon: Users, label: 'Klienti' },
  { to: '/sales', icon: ShoppingCart, label: 'Prodeje' },
];

export function MobileNav() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* Floating Tab Bar - positioned above iOS home indicator */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden pb-[env(safe-area-inset-bottom,8px)]">
        <div className="flex items-center justify-around bg-card/95 backdrop-blur-2xl rounded-t-[24px] px-2 py-2 border-t border-border/20 shadow-[0_-4px_30px_rgba(0,0,0,0.25)] mx-auto max-w-lg">
          
          {mainNavItems.map((item) => {
            const isActive = location.pathname === item.to || 
              (item.to !== '/' && location.pathname.startsWith(item.to));
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 touch-target',
                  'active:scale-95',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground/70 hover:text-foreground'
                )}
              >
                {/* Icon container - larger touch target */}
                <div className={cn(
                  'relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200',
                  isActive 
                    ? 'bg-primary/15 shadow-[0_0_20px_hsl(var(--primary)/0.3)]' 
                    : 'hover:bg-secondary/50'
                )}>
                  <Icon 
                    className={cn(
                      'w-6 h-6 transition-all duration-200',
                      isActive && 'scale-110'
                    )} 
                    strokeWidth={isActive ? 2.5 : 1.8} 
                  />
                </div>
                
                {/* Label */}
                <span className={cn(
                  'text-[10px] mt-1 transition-all duration-200 whitespace-nowrap',
                  isActive 
                    ? 'font-bold text-primary' 
                    : 'font-medium'
                )}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMenuOpen(true)}
            className="relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 touch-target active:scale-95 text-muted-foreground/70 hover:text-foreground"
          >
            <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 hover:bg-secondary/50">
              <MoreHorizontal className="w-6 h-6" strokeWidth={1.8} />
            </div>
            <span className="text-[10px] mt-1 font-medium whitespace-nowrap">Více</span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu (slide-out) */}
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
