import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Calendar,
  MoreHorizontal,
} from 'lucide-react';
import { MobileMenu } from './MobileMenu';

const mainNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Domů' },
  { to: '/calendar', icon: Calendar, label: 'Kalendář' },
  { to: '/clients', icon: Users, label: 'Klienti' },
];

export function MobileNav() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* Floating Tab Bar - positioned above iOS home indicator */}
      <nav className="fixed bottom-6 left-4 right-4 z-50 lg:hidden">
        <div className="flex items-center justify-around bg-card/90 backdrop-blur-2xl rounded-[28px] px-2 py-2 border border-border/20 shadow-[0_8px_32px_rgba(0,0,0,0.25)] mx-auto max-w-md">
          {mainNavItems.map((item) => {
            const isActive = location.pathname === item.to || 
              (item.to !== '/' && location.pathname.startsWith(item.to));
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 touch-target',
                  'active:scale-90',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground/70 hover:text-foreground'
                )}
              >
                {/* Icon container */}
                <div className={cn(
                  'relative flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-200',
                  isActive 
                    ? 'bg-primary/15' 
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

          {/* More button */}
          <button
            onClick={() => setMenuOpen(true)}
            className="relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 touch-target active:scale-90 text-muted-foreground/70 hover:text-foreground"
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-200 hover:bg-secondary/50">
              <MoreHorizontal className="w-[22px] h-[22px]" strokeWidth={1.8} />
            </div>
            <span className="text-[9px] mt-0.5 font-medium whitespace-nowrap">Více</span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu (slide-out) */}
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
