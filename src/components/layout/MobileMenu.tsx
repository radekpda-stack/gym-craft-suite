import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  UserCircle,
  Users,
  Dumbbell,
  Activity,
  Calendar,
  Settings,
  LogOut,
  X,
  Zap,
  MessageSquare,
  ShoppingBag,
  ClipboardList,
  LucideIcon,
  Utensils,
  FileText,
  PieChart,
  LayoutTemplate,
  ClipboardCheck,
  Target,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { Separator } from '@/components/ui/separator';
import { useModuleSettings } from '@/hooks/useModuleSettings';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { isModuleEnabled } = useModuleSettings();

  // Build sections based on enabled modules
  const sections: NavSection[] = useMemo(() => {
    const allSections: NavSection[] = [
      {
        label: 'Hlavní',
        items: [
          { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        ],
      },
      {
        label: 'Plánování',
        items: [
          { to: '/calendar', icon: Calendar, label: 'Kalendář' },
          { to: '/trainings', icon: Dumbbell, label: 'Tréninky' },
          ...(isModuleEnabled('training_templates') ? [{ to: '/training-templates', icon: LayoutTemplate, label: 'Šablony' }] : []),
        ],
      },
      {
        label: 'Klienti',
        items: [
          { to: '/clients', icon: Users, label: 'Klienti' },
          ...(isModuleEnabled('client_portal') ? [{ to: '/client-portal', icon: UserCircle, label: 'Klientský portál' }] : []),
          { to: '/my-profile', icon: UserCircle, label: 'Můj profil' },
        ],
      },
      {
        label: 'Záznamy',
        items: [
          { to: '/exercises', icon: Target, label: 'Cviky' },
          { to: '/records', icon: Activity, label: 'Záznamy' },
          ...(isModuleEnabled('tests') ? [{ to: '/tests', icon: ClipboardCheck, label: 'Testy' }] : []),
        ],
      },
      ...(isModuleEnabled('nutrition') ? [{
        label: 'Strava',
        items: [
          { to: '/nutrition', icon: Utensils, label: 'Přehled' },
          { to: '/nutrition/campaigns', icon: ClipboardList, label: 'Kampaně' },
          { to: '/nutrition/analysis', icon: PieChart, label: 'Analýza' },
          { to: '/nutrition/template', icon: FileText, label: 'Šablona dotazníku' },
        ],
      }] : []),
      {
        label: 'Finance',
        items: [
          { to: '/sales', icon: ShoppingBag, label: 'Prodeje' },
        ],
      },
      ...(isModuleEnabled('feedback') ? [{
        label: 'Komunikace',
        items: [
          { to: '/feedback-overview', icon: MessageSquare, label: 'Feedbacky' },
        ],
      }] : []),
      {
        label: 'Systém',
        items: [
          { to: '/settings', icon: Settings, label: 'Nastavení' },
        ],
      },
    ];

    return allSections.filter(section => section.items.length > 0);
  }, [isModuleEnabled]);

  const handleNavigation = (to: string) => {
    // Close menu first, then navigate after a brief delay to ensure smooth animation
    onClose();
    // Small delay to allow menu close animation to start
    setTimeout(() => {
      navigate(to);
    }, 50);
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se odhlásit.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Odhlášení úspěšné',
        description: 'Byli jste odhlášeni.',
      });
      navigate('/auth', { replace: true });
    }
    onClose();
  };

  const isActive = (to: string) => {
    return location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  };

  // Calculate global item index for staggered animation
  let globalItemIndex = 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div 
            className="fixed inset-0 z-[70] bg-background/60 backdrop-blur-md lg:hidden"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          
          {/* Menu Panel */}
          <motion.div 
            className="fixed inset-y-0 right-0 z-[70] w-full max-w-[300px] bg-background/95 backdrop-blur-xl border-l border-border/30 shadow-2xl lg:hidden"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <motion.div 
              className="flex items-center justify-between px-4 py-3 border-b border-border/30"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-2.5">
                <motion.div 
                  className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Zap className="w-4 h-4 text-primary-foreground" strokeWidth={2} />
                </motion.div>
                <span className="text-base font-bold tracking-tight">Just Move</span>
              </div>
              <div className="flex items-center gap-1">
                <NotificationCenter />
                <motion.button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-secondary/80 transition-colors touch-target"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>

            {/* Navigation */}
            <nav className="p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-180px)]">
              {sections.map((section, sectionIndex) => (
                <motion.div 
                  key={sectionIndex} 
                  className="space-y-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 + sectionIndex * 0.05 }}
                >
                  <motion.span 
                    className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 block"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + sectionIndex * 0.05 }}
                  >
                    {section.label}
                  </motion.span>
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.to);
                      const itemIndex = globalItemIndex++;

                      return (
                        <motion.button
                          key={item.to}
                          onClick={() => handleNavigation(item.to)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left touch-target relative',
                            active
                              ? 'bg-primary/10 text-primary'
                              : 'text-foreground/70 hover:bg-secondary/80 hover:text-foreground'
                          )}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ 
                            delay: 0.2 + itemIndex * 0.03,
                            duration: 0.2,
                            ease: [0.25, 0.1, 0.25, 1]
                          }}
                          whileTap={{ scale: 0.98, x: 2 }}
                        >
                          <AnimatePresence>
                            {active && (
                              <motion.div 
                                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full"
                                initial={{ scaleY: 0 }}
                                animate={{ scaleY: 1 }}
                                exit={{ scaleY: 0 }}
                                transition={{ duration: 0.2 }}
                              />
                            )}
                          </AnimatePresence>
                          <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.5} />
                          <span className="text-sm font-medium">{item.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                  {sectionIndex < sections.length - 1 && (
                    <Separator className="mt-2 bg-border/30" />
                  )}
                </motion.div>
              ))}
            </nav>

            {/* Footer */}
            <motion.div 
              className="absolute bottom-0 left-0 right-0 p-3 border-t border-border/30 bg-background/95 backdrop-blur-xl safe-area-bottom"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {user && (
                <motion.p 
                  className="text-[11px] text-muted-foreground/50 mb-2 truncate px-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                >
                  {user.email}
                </motion.p>
              )}
              <motion.button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors touch-target"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <LogOut className="w-4 h-4" strokeWidth={1.5} />
                <span className="text-sm font-medium">Odhlásit se</span>
              </motion.button>
            </motion.div>
          </motion.div>

        </>
      )}
    </AnimatePresence>
  );
}