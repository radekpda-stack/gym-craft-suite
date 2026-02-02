import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  CalendarDays,
  Users,
  ShoppingCart,
  MoreHorizontal,
  Bell,
} from 'lucide-react';
import { MobileMenu } from './MobileMenu';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { useAggregatedNotifications } from '@/hooks/useAggregatedNotifications';
import { useUnreadMessageCount } from '@/hooks/useChatMessages';
import { useTrainerConversations } from '@/hooks/useChatMessages';
import { Badge } from '@/components/ui/badge';

const mainNavItems = [
  { to: '/schedule', icon: CalendarDays, label: 'Rozvrh' },
  { to: '/clients', icon: Users, label: 'Klienti' },
  { to: '/sales', icon: ShoppingCart, label: 'Prodeje' },
];

export function MobileNav() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  // Use same counting logic as NotificationCenter for consistency
  const { unreadCount } = useAggregatedNotifications();
  const { data: conversations = [] } = useTrainerConversations();
  const unreadConversations = conversations.filter(c => c.unreadCount > 0);
  const totalUnread = unreadCount + unreadConversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <>
      {/* Floating Tab Bar - positioned above iOS home indicator */}
      <nav className="fixed bottom-6 left-4 right-4 z-50 lg:hidden">
        <div className="flex items-center justify-around bg-card/95 backdrop-blur-2xl rounded-[32px] px-2 py-3 border border-border/20 shadow-[0_8px_40px_rgba(0,0,0,0.3)] mx-auto max-w-md">
          
          {/* Notifications button - first position */}
          <NotificationCenter onOpenChange={setNotificationsOpen}>
            <button
              className={cn(
                'relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 touch-target',
                'active:scale-95',
                notificationsOpen
                  ? 'text-primary'
                  : 'text-muted-foreground/70 hover:text-foreground'
              )}
            >
              {/* Icon container - larger touch target */}
              <div className={cn(
                'relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200',
                notificationsOpen 
                  ? 'bg-primary/15 shadow-[0_0_20px_hsl(var(--primary)/0.3)]' 
                  : 'hover:bg-secondary/50'
              )}>
                <Bell 
                  className={cn(
                    'w-6 h-6 transition-all duration-200',
                    notificationsOpen && 'scale-110'
                  )} 
                  strokeWidth={notificationsOpen ? 2.5 : 1.8} 
                />
                {totalUnread > 0 && (
                  <Badge 
                    className="absolute -top-0.5 -right-0.5 h-5 min-w-[20px] px-1.5 bg-destructive text-destructive-foreground text-[11px] flex items-center justify-center shadow-lg"
                  >
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </Badge>
                )}
              </div>
              
              {/* Label */}
              <span className={cn(
                'text-[10px] mt-1 transition-all duration-200 whitespace-nowrap',
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
