import { useState, useEffect, memo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Activity,
  Calendar,
  Settings,
  ChevronRight,
  Zap,
  LogOut,
  // Sparkles, // Hidden - AI feature disabled
  TrendingUp,
  ShoppingBag,
  ClipboardList,
  Bell,
  BarChart3,
  LucideIcon,
} from 'lucide-react';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { UnifiedCreditModal } from '@/components/credit/UnifiedCreditModal';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  id: string;
  to: string;
  icon: LucideIcon;
  label: string;
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
  isActive, 
  collapsed,
}: { 
  item: NavItem; 
  isActive: boolean; 
  collapsed: boolean;
}) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
      )}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
      )}
      <Icon className={cn(
        'w-[18px] h-[18px] flex-shrink-0 transition-transform duration-200',
        !isActive && 'group-hover:scale-105'
      )} strokeWidth={1.5} />
      {!collapsed && (
        <span className="text-sm font-medium truncate">
          {item.label}
        </span>
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
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { t } = useLanguage();

  // Define sections with items - OPTIMIZED STRUCTURE
  const isAdminUser = user?.email === 'radek.pda@gmail.com';
  
  const sections: NavSection[] = [
    {
      label: 'Hlavní',
      items: [
        { id: 'dashboard', to: '/', icon: LayoutDashboard, label: t.nav.dashboard },
      ],
    },
    {
      label: 'Plánování',
      items: [
        { id: 'calendar', to: '/calendar', icon: Calendar, label: t.nav.calendar },
        { id: 'trainings', to: '/trainings', icon: Dumbbell, label: t.nav.trainings },
        // { id: 'training-plans', to: '/training-plans', icon: ClipboardList, label: 'Tréninkové plány' }, // Hidden
      ],
    },
    {
      label: 'Záznamy',
      items: [
        { id: 'clients', to: '/clients', icon: Users, label: t.nav.clients },
        { id: 'records', to: '/records', icon: Activity, label: 'Záznamy' },
        { id: 'feedback-overview', to: '/feedback-overview', icon: TrendingUp, label: 'Feedbacky' },
      ],
    },
    {
      label: 'Finance',
      items: [
        { id: 'sales', to: '/sales', icon: ShoppingBag, label: t.nav.sales },
        { id: 'statistics', to: '/statistics', icon: BarChart3, label: 'Statistiky' },
      ],
    },
    // AI section hidden for future use
    // {
    //   label: 'Nástroje',
    //   items: [
    //     { id: 'ai-assistant', to: '/ai-assistant', icon: Sparkles, label: t.nav.aiAssistant },
    //   ],
    // },
    {
      label: 'Systém',
      items: [
        { id: 'settings', to: '/settings', icon: Settings, label: t.nav.settings },
        ...(isAdminUser ? [{ id: 'app-usage', to: '/app-usage', icon: Activity, label: 'App Usage' }] : []),
      ],
    },
  ];

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

  const isActive = (to: string) => {
    return location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
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
                      isActive={isActive(item.to)}
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
        
        {/* Quick Credit */}
        <motion.div 
          className="pt-3 mt-3 border-t border-sidebar-border/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <UnifiedCreditModal collapsed={collapsed} />
        </motion.div>
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