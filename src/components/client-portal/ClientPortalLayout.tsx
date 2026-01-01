import { ReactNode, useEffect, useRef } from 'react';
import { NavLink, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Calendar, 
  Wallet, 
  Apple, 
  LogOut,
  Settings,
  Trophy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientNutritionCampaign } from '@/hooks/useClientPortalData';
import { motion } from 'framer-motion';
import { trackEvent } from '@/lib/analytics/trackEvent';
import { sessionManager } from '@/lib/analytics/SessionManager';

interface ClientPortalLayoutProps {
  children: ReactNode;
}

// Base nav items (always visible)
const baseNavItems = [
  { to: '/client', icon: LayoutDashboard, label: 'Přehled', trackName: 'overview' },
  { to: '/client/progress', icon: TrendingUp, label: 'Pokrok', trackName: 'progress' },
  { to: '/client/attendance', icon: Calendar, label: 'Docházka', trackName: 'attendance' },
  { to: '/client/credit', icon: Wallet, label: 'Kredit', trackName: 'credit' },
  { to: '/client/challenges', icon: Trophy, label: 'Výzvy', trackName: 'challenges' },
];

// Conditional nav item
const nutritionNavItem = { to: '/client/nutrition', icon: Apple, label: 'Strava', trackName: 'nutrition' };

// Settings nav item (always at the end)
const settingsNavItem = { to: '/client/settings', icon: Settings, label: 'Nastavení', trackName: 'settings' };

// Mobile nav - core items only (5 items to prevent overflow)
const mobileNavItems = [
  { to: '/client', icon: LayoutDashboard, label: 'Přehled', trackName: 'overview' },
  { to: '/client/progress', icon: TrendingUp, label: 'Pokrok', trackName: 'progress' },
  { to: '/client/challenges', icon: Trophy, label: 'Výzvy', trackName: 'challenges' },
  { to: '/client/attendance', icon: Calendar, label: 'Docházka', trackName: 'attendance' },
  { to: '/client/settings', icon: Settings, label: 'Nastavení', trackName: 'settings' },
];

export function ClientPortalLayout({ children }: ClientPortalLayoutProps) {
  const { isAuthenticated, loading, clientProfile, clientId, signOut } = useClientPortal();
  const location = useLocation();
  const sessionInitialized = useRef(false);

  // Check if nutrition campaign is active
  const { data: nutritionCampaign } = useClientNutritionCampaign(clientId ?? undefined);
  const hasActiveNutrition = nutritionCampaign?.isActive;

  // Build desktop nav items dynamically
  const allNavItems = [
    ...baseNavItems,
    ...(hasActiveNutrition ? [nutritionNavItem] : []),
    settingsNavItem,
  ];

  // Initialize session tracking for client portal
  useEffect(() => {
    if (isAuthenticated && clientId && !sessionInitialized.current) {
      sessionInitialized.current = true;
      sessionManager.initialize(clientId).catch(console.debug);
    }
  }, [isAuthenticated, clientId]);

  // Track navigation
  useEffect(() => {
    if (!isAuthenticated || !clientId) return;
    
    const currentNav = allNavItems.find(item => 
      location.pathname === item.to || 
      (item.to !== '/client' && location.pathname.startsWith(item.to))
    );
    
    if (currentNav) {
      trackEvent('client_portal_navigation', 'client-portal', {
        metadata: {
          client_id: clientId,
          section: currentNav.trackName,
          path: location.pathname
        }
      });
    }
  }, [location.pathname, isAuthenticated, clientId, allNavItems]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Načítám portál...</p>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/client/login" state={{ from: location }} replace />;
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 md:pl-20">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b md:hidden">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">
                {clientProfile?.name?.charAt(0) ?? 'K'}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium">{clientProfile?.name ?? 'Klient'}</p>
            </div>
          </div>
          <button 
            onClick={() => signOut()}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-20 bg-card border-r hidden md:flex flex-col items-center py-6 z-50">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mb-8">
          <span className="text-lg font-bold text-primary-foreground">JM</span>
        </div>
        
        <nav className="flex-1 flex flex-col gap-2">
          {allNavItems.map((item) => {
            const isActive = location.pathname === item.to || 
              (item.to !== '/client' && location.pathname.startsWith(item.to));
            
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                  "hover:bg-accent group relative",
                  isActive && "bg-primary text-primary-foreground"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5",
                  !isActive && "text-muted-foreground group-hover:text-foreground"
                )} />
                
                {/* Tooltip */}
                <span className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">
              {clientProfile?.name?.charAt(0) ?? 'K'}
            </span>
          </div>
          <button 
            onClick={() => signOut()}
            className="w-12 h-12 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-3.5rem)] md:min-h-screen">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="p-4 md:p-6 max-w-4xl mx-auto"
        >
          {children}
        </motion.div>
      </main>

      {/* Mobile Bottom Navigation - Only 5 items to prevent overflow */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t z-50 md:hidden safe-area-pb">
        <div className="flex items-center justify-around h-16 px-2">
          {mobileNavItems.map((item) => {
            const isActive = location.pathname === item.to || 
              (item.to !== '/client' && location.pathname.startsWith(item.to));
            
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-2 rounded-lg transition-all relative",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 transition-transform shrink-0",
                  isActive && "scale-110"
                )} />
                <span className="text-[9px] font-medium truncate max-w-full px-1">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary"
                  />
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
