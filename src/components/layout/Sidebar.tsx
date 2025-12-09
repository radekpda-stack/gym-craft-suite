import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  ChevronLeft,
  ChevronRight,
  Zap,
  LogOut,
  Sparkles,
  TrendingUp,
  ShoppingBag,
  Wallet,
  LucideIcon,
} from 'lucide-react';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { QuickCreditModal } from '@/components/credit/QuickCreditModal';
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

function NavItemButton({ 
  item, 
  isActive, 
  collapsed 
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
      {/* Orange active indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
      )}
      <Icon className={cn(
        'w-[18px] h-[18px] flex-shrink-0 transition-transform duration-200',
        !isActive && 'group-hover:scale-105'
      )} strokeWidth={1.5} />
      {!collapsed && (
        <span className="text-sm font-medium truncate">{item.label}</span>
      )}
    </NavLink>
  );
}

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return null;
  return (
    <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
      {label}
    </span>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { t } = useLanguage();

  // Define sections with items
  const sections: NavSection[] = [
    {
      label: 'Hlavní',
      items: [
        { id: 'dashboard', to: '/', icon: LayoutDashboard, label: t.nav.dashboard },
        { id: 'calendar', to: '/calendar', icon: Calendar, label: t.nav.calendar },
        { id: 'trainings', to: '/trainings', icon: Dumbbell, label: t.nav.trainings },
        { id: 'clients', to: '/clients', icon: Users, label: t.nav.clients },
      ],
    },
    {
      label: 'Klientská data',
      items: [
        { id: 'measurements', to: '/measurements', icon: Activity, label: t.nav.measurements },
        { id: 'progress', to: '/progress', icon: TrendingUp, label: t.nav.progress },
        { id: 'diagnostics', to: '/diagnostics', icon: Stethoscope, label: t.nav.diagnostics },
      ],
    },
    {
      label: 'Finance',
      items: [
        { id: 'sales', to: '/sales', icon: ShoppingBag, label: t.nav.sales },
      ],
    },
    {
      label: 'Nástroje',
      items: [
        { id: 'ai-assistant', to: '/ai-assistant', icon: Sparkles, label: t.nav.aiAssistant },
      ],
    },
    {
      label: 'Systém',
      items: [
        { id: 'settings', to: '/settings', icon: Settings, label: t.nav.settings },
        { id: 'canceled', to: '/canceled', icon: XCircle, label: t.nav.canceled },
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

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen sidebar-glass transition-all duration-300 ease-in-out flex flex-col',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo & Notifications */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border/30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" strokeWidth={2} />
          </div>
          {!collapsed && (
            <span className="text-base font-bold text-sidebar-foreground tracking-tight">
              FitCoach
            </span>
          )}
        </div>
        {!collapsed && <NotificationCenter />}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <div className="space-y-4">
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-1">
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
            </div>
          ))}
        </div>
        
        {/* Quick Credit */}
        <div className="pt-3 mt-3 border-t border-sidebar-border/30">
          <QuickCreditModal collapsed={collapsed} />
        </div>
      </nav>

      {/* User & Controls */}
      <div className="px-2 pb-3 space-y-1.5 border-t border-sidebar-border/30 pt-3">
        {/* User email display */}
        {!collapsed && user && (
          <div className="px-3 py-1.5 text-[11px] text-sidebar-foreground/40 truncate">
            {user.email}
          </div>
        )}
        
        {/* Logout button */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
        >
          <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
          {!collapsed && <span className="text-sm font-medium">{t.nav.logout}</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs">{t.nav.collapseMenu}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}