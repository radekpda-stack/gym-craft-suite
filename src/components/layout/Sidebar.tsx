import { useState, memo, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Activity,
  Calendar,
  Settings,
  ChevronRight,
  Zap,
  LogOut,
  TrendingUp,
  ShoppingBag,
  BarChart3,
  LucideIcon,
  Utensils,
  LayoutTemplate,
  Receipt,
  UserCircle,
  StickyNote,
} from 'lucide-react';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n';
import { Separator } from '@/components/ui/separator';
import { useModuleSettings } from '@/hooks/useModuleSettings';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  id: string;
  to: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

interface SidebarProps {
  onCollapseChange?: (collapsed: boolean) => void;
}

const NavItemButton = memo(function NavItemButton({ 
  item, 
  collapsed,
  isChild = false,
}: { 
  item: NavItem; 
  collapsed: boolean;
  isChild?: boolean;
}) {
  const Icon = item.icon;
  const location = useLocation();
  
  // Determine if this item is active
  const isActive = location.pathname === item.to || 
    (item.to !== '/' && location.pathname.startsWith(item.to + '/'));

  return (
    <NavLink
      to={item.to}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative',
        isChild && !collapsed && 'pl-9',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
      )}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
      )}
      <div className="relative">
        <Icon className={cn(
          'w-[18px] h-[18px] flex-shrink-0 transition-transform duration-200',
          !isActive && 'group-hover:scale-105'
        )} strokeWidth={1.5} />
        {item.badge && item.badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full">
            {item.badge > 9 ? '9+' : item.badge}
          </span>
        )}
      </div>
      {!collapsed && (
        <>
          <span className="text-sm font-medium truncate flex-1">
            {item.label}
          </span>
          {item.badge && item.badge > 0 && (
            <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
              {item.badge}
            </Badge>
          )}
        </>
      )}
    </NavLink>
  );
});

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  return (
    <AnimatePresence mode="wait">
      {!collapsed && (
        <motion.span 
          className="px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.15 }}
        >
          {label}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

export function Sidebar({ onCollapseChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(true); // Default collapsed for premium look
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { t } = useLanguage();
  const { isModuleEnabled } = useModuleSettings();

  // Define sections with items - SIMPLIFIED: 4 main sections
  const sections: NavSection[] = useMemo(() => {
    const allSections: NavSection[] = [
      {
        label: 'Hlavní',
        items: [
          { id: 'dashboard', to: '/', icon: LayoutDashboard, label: t.nav.dashboard },
          { id: 'schedule', to: '/schedule', icon: Calendar, label: 'Rozvrh' },
          { id: 'clients', to: '/clients', icon: Users, label: t.nav.clients },
        ],
      },
      {
        label: 'Data & Výkonnost',
        items: [
          { id: 'performance', to: '/performance', icon: Zap, label: 'Výkonnost' },
          { id: 'records', to: '/records', icon: Activity, label: 'Záznamy' },
          ...(isModuleEnabled('training_templates') ? [{ id: 'training-templates', to: '/training-templates', icon: LayoutTemplate, label: 'Workouty' }] : []),
          ...(isModuleEnabled('nutrition') ? [{ id: 'nutrition', to: '/nutrition', icon: Utensils, label: 'Strava' }] : []),
          ...(isModuleEnabled('feedback') ? [{ id: 'feedback-overview', to: '/feedback-overview', icon: TrendingUp, label: 'Zpětná vazba' }] : []),
          { id: 'notes', to: '/notes', icon: StickyNote, label: 'Poznámky' },
        ],
      },
      {
        label: 'Finance',
        items: [
          { id: 'sales', to: '/sales', icon: ShoppingBag, label: t.nav.sales },
          { id: 'expenses', to: '/expenses', icon: Receipt, label: 'Náklady' },
          { id: 'statistics', to: '/statistics', icon: BarChart3, label: 'Statistiky' },
        ],
      },
      {
        label: 'Systém',
        items: [
          ...(isModuleEnabled('client_portal') ? [{ id: 'client-portal', to: '/client-portal', icon: UserCircle, label: 'Klientský portál' }] : []),
          { id: 'my-profile', to: '/my-profile', icon: UserCircle, label: 'Můj profil' },
          { id: 'settings', to: '/settings', icon: Settings, label: t.nav.settings },
        ],
      },
    ];

    // Filter out sections that have no visible items
    return allSections.filter(section => section.items.length > 0);
  }, [t, isModuleEnabled]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: t.errors.generic,
        description: t.auth.logoutError,
        variant: 'destructive',
      });
    } else {
      toast({
        title: t.auth.logoutSuccess,
        description: t.auth.logoutSuccessDesc,
      });
      navigate('/auth', { replace: true });
    }
  };

  // Notify parent about collapse state changes
  const handleToggleCollapse = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    onCollapseChange?.(newCollapsed);
  };

  return (
    <motion.aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen sidebar-glass flex flex-col',
        collapsed ? 'w-16' : 'w-56'
      )}
      animate={{ width: collapsed ? 64 : 224 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Logo & Notifications */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border/30">
        <div className="flex items-center gap-2.5">
          <motion.div 
            className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Zap className="w-4 h-4 text-primary-foreground" strokeWidth={2} />
          </motion.div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span 
                className="text-base font-bold text-sidebar-foreground tracking-tight"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                Just Move
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <NotificationCenter />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <div className="space-y-4">
          {sections.map((section, sectionIndex) => (
            <motion.div 
              key={sectionIndex} 
              className="space-y-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: sectionIndex * 0.05 }}
            >
              {section.label && (
                <SectionLabel label={section.label} collapsed={collapsed} />
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavItemButton
                    key={item.id}
                    item={item}
                    collapsed={collapsed}
                  />
                ))}
              </div>
              {sectionIndex < sections.length - 1 && (
                <Separator className="my-3 bg-sidebar-border/30" />
              )}
            </motion.div>
          ))}
        </div>
      </nav>

      {/* User & Controls */}
      <div className="px-2 pb-3 space-y-1.5 border-t border-sidebar-border/30 pt-3">
        {/* User email display */}
        <AnimatePresence>
          {!collapsed && user && (
            <motion.div 
              className="px-3 py-1.5 text-[11px] text-sidebar-foreground/40 truncate"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {user.email}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Logout button */}
        <motion.button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors duration-200"
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
        >
          <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span 
                className="text-sm font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {t.nav.logout}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Collapse toggle */}
        <motion.button
          onClick={handleToggleCollapse}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors duration-200"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div
            animate={{ rotate: collapsed ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronRight className="w-4 h-4" />
          </motion.div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span 
                className="text-xs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {t.nav.collapseMenu}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.aside>
  );
}