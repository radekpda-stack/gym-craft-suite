import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  ClipboardList,
  Users,
  ShoppingCart,
  MoreHorizontal,
  Bell,
} from 'lucide-react';
import { MobileMenu } from './MobileMenu';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { useUnreadNotificationsCount } from '@/hooks/useNotifications';
import { useUnreadMessageCount } from '@/hooks/useChatMessages';
import { Badge } from '@/components/ui/badge';

const mainNavItems = [
  { to: '/trainings', icon: ClipboardList, label: 'Tréninky' },
  { to: '/clients', icon: Users, label: 'Klienti' },
  { to: '/sales', icon: ShoppingCart, label: 'Prodeje' },
];

export function MobileNav() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  // Combine notification count + unread messages
  const { data: notificationCount = 0 } = useUnreadNotificationsCount();
  const { data: unreadMessagesCount = 0 } = useUnreadMessageCount();
  const totalUnread = notificationCount + unreadMessagesCount;

  return (
    <>
      {/* Floating Tab Bar - positioned above iOS home indicator */}
      <nav className="fixed bottom-6 left-4 right-4 z-50 lg:hidden">
        <div className="flex items-center justify-around bg-card/90 backdrop-blur-2xl rounded-[28px] px-2 py-2 border border-border/20 shadow-[0_8px_32px_rgba(0,0,0,0.25)] mx-auto max-w-md">
          
          {/* Notifications button - first position */}
          <NotificationCenter onOpenChange={setNotificationsOpen}>
            <button
              className={cn(
                'relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 touch-target',
                'active:scale-90',
                notificationsOpen
                  ? 'text-primary'
                  : 'text-muted-foreground/70 hover:text-foreground'
              )}
            >
              {/* Icon container */}
              <div className={cn(
                'relative flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-200',
                notificationsOpen 
                  ? 'bg-primary/15' 
                  : 'hover:bg-secondary/50'
              )}>
                <Bell 
                  className={cn(
                    'w-[22px] h-[22px] transition-all duration-200',
                    notificationsOpen && 'scale-110'
                  )} 
                  strokeWidth={notificationsOpen ? 2.5 : 1.8} 
                />
                {totalUnread > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center"
                  >
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </Badge>
                )}
              </div>
              
              {/* Label */}
              <span className={cn(
                'text-[9px] mt-0.5 transition-all duration-200 whitespace-nowrap',
                notificationsOpen 
                  ? 'font-bold text-primary' 
                  : 'font-medium'
              )}>
                Oznámení
              </span>
            </button>
          </NotificationCenter>

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
