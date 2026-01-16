import { ReactNode, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  TrendingUp, 
  LogOut,
  Settings,
  Trophy,
  BookOpen,
  Award,
  Users,
  ShoppingBag,
  Dumbbell,
  MessageCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { motion } from 'framer-motion';
import { trackEvent } from '@/lib/analytics/trackEvent';
import { sessionManager } from '@/lib/analytics/SessionManager';
import { ClientNotificationCenter } from './ClientNotificationCenter';
import { CredentialsReminderDialog } from './CredentialsReminderDialog';
import { LogoutConfirmDialog } from './common/LogoutConfirmDialog';
import { useClientPortalDemo } from '@/hooks/useClientPortalDemo';
import { DemoModeBanner } from './DemoModeBanner';
import { AvatarCelebration } from './celebrations';

interface ClientPortalLayoutProps {
  children: ReactNode;
}

type NavItem = {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  trackName: string;
};

function buildBaseNavItems(base: string): NavItem[] {
  return [
    { to: base, icon: LayoutDashboard, label: 'Přehled', trackName: 'overview' },
    { to: `${base}/diary`, icon: BookOpen, label: 'Deník', trackName: 'diary' },
    { to: `${base}/progress`, icon: TrendingUp, label: 'Pokrok', trackName: 'progress' },
    { to: `${base}/chat`, icon: MessageCircle, label: 'Chat', trackName: 'chat' },
    { to: `${base}/leaderboard`, icon: Users, label: 'Žebříček', trackName: 'leaderboard' },
    { to: `${base}/challenges`, icon: Trophy, label: 'Výzvy', trackName: 'challenges' },
    { to: `${base}/badges`, icon: Award, label: 'Odznaky', trackName: 'badges' },
  ];
}

// Nutrition nav item removed - now accessible via Diary tab

function buildPurchasesNavItem(base: string): NavItem {
  return { to: `${base}/purchases`, icon: ShoppingBag, label: 'Nákupy', trackName: 'purchases' };
}

function buildSettingsNavItem(base: string): NavItem {
  return { to: `${base}/settings`, icon: Settings, label: 'Nastavení', trackName: 'settings' };
}

function buildMobileNavItems(base: string): NavItem[] {
  return [
    { to: base, icon: LayoutDashboard, label: 'Přehled', trackName: 'overview' },
    { to: `${base}/diary`, icon: BookOpen, label: 'Deník', trackName: 'diary' },
    { to: `${base}/chat`, icon: MessageCircle, label: 'Chat', trackName: 'chat' },
    { to: `${base}/purchases`, icon: ShoppingBag, label: 'Nákupy', trackName: 'purchases' },
    { to: `${base}/settings`, icon: Settings, label: 'Více', trackName: 'settings' },
  ];
}

export function ClientPortalLayout({ children }: ClientPortalLayoutProps) {
  const { 
    isAuthenticated, 
    loading, 
    clientProfile, 
    clientId, 
    signOut,
    user,
    shouldShowCredentialsReminder,
    loginCount,
    refetchClientAccount,
    dismissCredentialsReminder,
  } = useClientPortal();
  const location = useLocation();

  // Keep navigation inside the currently used portal prefix
  // ("/zona" for short URL portal, "/client" for legacy portal)
  const basePath = location.pathname.startsWith('/zona') ? '/zona' : '/client';
  const baseNavItems = buildBaseNavItems(basePath);
  const purchasesNavItem = buildPurchasesNavItem(basePath);
  const settingsNavItem = buildSettingsNavItem(basePath);
  const mobileNavItems = buildMobileNavItems(basePath);

  const sessionInitialized = useRef(false);
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  
  // Demo mode support
  const { isDemo, demoClientProfile, demoClientId } = useClientPortalDemo();
  const effectiveClientProfile = isDemo ? demoClientProfile : clientProfile;
  const effectiveClientId = isDemo ? demoClientId : clientId;
  const effectiveIsAuthenticated = isDemo ? true : isAuthenticated;

  // Show credentials dialog when needed (after initial load) - not in demo mode
  useEffect(() => {
    if (shouldShowCredentialsReminder && !showCredentialsDialog && !isDemo) {
      // Small delay to let the page render first
      const timer = setTimeout(() => setShowCredentialsDialog(true), 500);
      return () => clearTimeout(timer);
    }
  }, [shouldShowCredentialsReminder, showCredentialsDialog, isDemo]);

  // Build desktop nav items dynamically (nutrition is now in diary tab)
  const allNavItems = [
    ...baseNavItems,
    purchasesNavItem,
    settingsNavItem,
  ];

  // Initialize session tracking for client portal - skip in demo mode
  useEffect(() => {
    if (isDemo) return;
    if (isAuthenticated && clientId && !sessionInitialized.current) {
      sessionInitialized.current = true;
      sessionManager.initialize(clientId).catch(() => {});
    }
  }, [isAuthenticated, clientId, isDemo]);

  // Track navigation - skip in demo mode
  useEffect(() => {
    if (isDemo) return;
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
  }, [location.pathname, isAuthenticated, clientId, allNavItems, isDemo]);

  // Skip loading check in demo mode
  if (!isDemo && loading) {
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

  // Skip auth check in demo mode
  if (!effectiveIsAuthenticated) {
    return <Navigate to="/client/login" state={{ from: location }} replace />;
  }

  return (
    <>
      {/* Demo Mode Banner */}
      {isDemo && <DemoModeBanner />}
      
      {/* Credentials Reminder Dialog - not in demo mode */}
      {!isDemo && (
        <CredentialsReminderDialog
          open={showCredentialsDialog}
          loginCount={loginCount}
          currentEmail={user?.email}
          onSuccess={() => {
            setShowCredentialsDialog(false);
            refetchClientAccount();
          }}
          onSkip={() => {
            setShowCredentialsDialog(false);
            dismissCredentialsReminder();
          }}
        />
      )}

      <div className={cn(
        "min-h-screen bg-background pb-20 md:pb-0 md:pl-20",
        isDemo && "pt-10" // Add padding for demo banner
      )}>
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b md:hidden">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <AvatarCelebration>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">
                  {effectiveClientProfile?.first_name?.charAt(0) || effectiveClientProfile?.name?.charAt(0) || 'K'}
                </span>
              </div>
            </AvatarCelebration>
            <div>
              <p className="text-sm font-medium">{effectiveClientProfile?.first_name || effectiveClientProfile?.name || 'Klient'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isDemo && <ClientNotificationCenter />}
            {!isDemo && <LogoutConfirmDialog onConfirm={signOut} />}
          </div>
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
          {!isDemo && <ClientNotificationCenter />}
          <AvatarCelebration>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">
                {effectiveClientProfile?.name?.charAt(0) ?? 'K'}
              </span>
            </div>
          </AvatarCelebration>
          {!isDemo && (
            <LogoutConfirmDialog 
              onConfirm={signOut}
              className="w-12 h-12 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            />
          )}
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
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t z-50 md:hidden pb-[env(safe-area-inset-bottom)]">
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
    </>
  );
}
