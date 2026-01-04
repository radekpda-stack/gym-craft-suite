import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus,
  X,
  Dumbbell,
  Activity,
  Stethoscope,
  Wallet,
  ShoppingBag,
  Trophy,
  UserPlus,
  ClipboardList,
  Package,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateTrainingDialog } from '@/components/trainings/CreateTrainingDialog';
import { CreateMeasurementSheet } from '@/components/measurements/CreateMeasurementSheet';
import { CreateDiagnosticSheet } from '@/components/diagnostics/CreateDiagnosticSheet';
import { UnifiedCreditModal } from '@/components/credit/UnifiedCreditModal';
import { NewSaleDialog } from '@/components/sales/NewSaleDialog';
import { AddPerformanceSheet } from '@/components/performance/AddPerformanceSheet';
import { CreateClientSheet } from '@/components/clients/CreateClientSheet';
import { PreDiagnosticInviteDialog } from '@/components/pre-diagnostic/PreDiagnosticInviteDialog';
import { ExerciseFormDialog } from '@/components/exercises/ExerciseFormDialog';
import { QuickLogDialog } from '@/components/exercises/QuickLogDialog';
import { useClients } from '@/hooks/useClients';
import { useCreateTrainingSession } from '@/hooks/useTrainingSessions';
import { useAddTrainingSessionTags } from '@/hooks/useTrainingSessionTags';
import { useTrainingPrices } from '@/hooks/useAppSettings';
import { useCreateMeasurement } from '@/hooks/useMeasurements';
import { useLayoutPreferences } from '@/hooks/useLayoutPreferences';
import { EnhancedTrainingFormValues } from '@/components/trainings/EnhancedTrainingForm';
import { featureTracker } from '@/hooks/useFeatureTracking';

interface QuickAction {
  id: string;
  icon: LucideIcon;
  label: string;
  color: string;
}

// All available actions
const allActionsConfig: QuickAction[] = [
  { id: 'sale', icon: ShoppingBag, label: 'Nový prodej', color: 'bg-pink-500' },
  { id: 'credit', icon: Wallet, label: 'Dobít kredit', color: 'bg-amber-500' },
  { id: 'training', icon: Dumbbell, label: 'Nový trénink', color: 'bg-primary' },
  { id: 'diagnostic', icon: Stethoscope, label: 'Nová diagnostika', color: 'bg-purple-500' },
  { id: 'measurement', icon: Activity, label: 'Nové měření', color: 'bg-green-500' },
  { id: 'performance', icon: Trophy, label: 'Zapsat výkon', color: 'bg-emerald-500' },
  { id: 'client', icon: UserPlus, label: 'Nový klient', color: 'bg-blue-500' },
  { id: 'prediagnostic', icon: ClipboardList, label: 'Pozvat klienta', color: 'bg-violet-500' },
  { id: 'exercise', icon: Dumbbell, label: 'Nový cvik', color: 'bg-primary' },
  { id: 'stock', icon: Package, label: 'Přidat zboží', color: 'bg-cyan-500' },
];

// Route-specific action configurations
const routeActionsConfig: Record<string, string[]> = {
  '/': ['sale', 'credit', 'training', 'diagnostic', 'measurement', 'performance'], // Dashboard - full actions
  '/clients': ['client', 'credit', 'prediagnostic'],
  '/trainings': ['training', 'sale', 'credit'],
  '/calendar': ['training'],
  '/performance': ['exercise', 'performance'],
  '/sales': ['sale', 'stock'],
  '/records': ['measurement', 'diagnostic'],
};

// Routes where FAB should be hidden completely
const hiddenRoutes = ['/statistics', '/nutrition', '/settings'];

function getActionsForRoute(pathname: string): QuickAction[] {
  // Check hidden routes first
  if (hiddenRoutes.some(route => pathname.startsWith(route))) {
    return [];
  }

  // Find matching route config
  for (const [route, actionIds] of Object.entries(routeActionsConfig)) {
    if (pathname === route || (route !== '/' && pathname.startsWith(route))) {
      return actionIds
        .map(id => allActionsConfig.find(a => a.id === id))
        .filter((a): a is QuickAction => a !== undefined);
    }
  }

  // Default to dashboard actions for unknown routes
  return routeActionsConfig['/']
    .map(id => allActionsConfig.find(a => a.id === id))
    .filter((a): a is QuickAction => a !== undefined);
}

export function QuickActionButton() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  
  const { data: clients = [] } = useClients();
  const createTraining = useCreateTrainingSession();
  const addTrainingTags = useAddTrainingSessionTags();
  const trainingPrices = useTrainingPrices();
  const createMeasurement = useCreateMeasurement();
  const { preferences } = useLayoutPreferences();

  // Get actions based on current route
  const routeActions = useMemo(() => {
    return getActionsForRoute(location.pathname);
  }, [location.pathname]);

  // For dashboard, apply user preferences ordering
  const visibleActions = useMemo(() => {
    if (location.pathname === '/') {
      // Apply user preferences for dashboard
      return preferences.quickActionOrder
        .filter(id => !preferences.hiddenQuickActions.includes(id))
        .map(id => allActionsConfig.find(a => a.id === id))
        .filter((a): a is QuickAction => a !== undefined);
    }
    return routeActions;
  }, [location.pathname, routeActions, preferences.quickActionOrder, preferences.hiddenQuickActions]);

  // Don't render if no actions for this route
  if (visibleActions.length === 0) {
    return null;
  }

  const handleAction = (actionId: string) => {
    featureTracker.track(`fab_action_${actionId}`, 'navigation');
    setIsOpen(false);
    
    // Handle navigation-based actions
    if (actionId === 'stock') {
      navigate('/sales?tab=stock&action=add');
      return;
    }
    
    setActiveSheet(actionId);
  };

  const handleFabToggle = () => {
    if (!isOpen) {
      featureTracker.track('fab_open', 'navigation');
    }
    setIsOpen(!isOpen);
  };

  const handleCreateTraining = async (data: EnhancedTrainingFormValues, tagIds: string[]) => {
    try {
      const result = await createTraining.mutateAsync({
        client_id: data.client_id,
        date: new Date(data.date).toISOString(),
        duration: data.duration,
        notes: data.notes,
        status: 'scheduled',
        participant_count: data.participant_count,
        trainingPrices,
      });
      
      if (tagIds.length > 0 && result?.session?.id) {
        await addTrainingTags.mutateAsync({
          trainingSessionId: result.session.id,
          tagIds,
        });
      }
      
      setActiveSheet(null);
    } catch (error) {
      console.error('Error creating training:', error);
    }
  };

  const handleCreateMeasurement = async (data: any): Promise<string | void> => {
    const result = await createMeasurement.mutateAsync(data);
    setActiveSheet(null);
    return result?.id;
  };

  return (
    <>
      {/* FAB Button */}
      <div className="fixed right-4 lg:right-6 bottom-[calc(88px+env(safe-area-inset-bottom))] md:bottom-[calc(24px+env(safe-area-inset-bottom))] z-[60]">
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                className="fixed inset-0 bg-background/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
              />
              
              {/* Actions Menu */}
              <motion.div
                className="absolute bottom-16 right-0 flex flex-col-reverse gap-3 items-end"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
              >
              {visibleActions.map((action, index) => (
                  <motion.button
                    key={action.id}
                    className="flex items-center gap-3 group"
                    initial={{ opacity: 0, x: 20, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.8 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleAction(action.id)}
                  >
                    {/* Label */}
                    <span className="px-3 py-1.5 rounded-lg bg-card text-sm font-medium text-foreground shadow-lg border border-border whitespace-nowrap">
                      {action.label}
                    </span>
                    
                    {/* Icon Button */}
                    <motion.div
                      className={cn(
                        'w-12 h-12 rounded-full flex items-center justify-center shadow-lg',
                        action.color
                      )}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <action.icon className="w-5 h-5 text-white" />
                    </motion.div>
                  </motion.button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main FAB */}
        <motion.button
          className={cn(
            'w-14 h-14 rounded-full flex items-center justify-center shadow-xl',
            'bg-primary hover:bg-primary/90 transition-colors',
            isOpen && 'bg-secondary hover:bg-secondary/90'
          )}
          onClick={handleFabToggle}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? (
            <X className="w-6 h-6 text-foreground" />
          ) : (
            <Plus className="w-6 h-6 text-primary-foreground" />
          )}
        </motion.button>
      </div>

      {/* Sheets/Dialogs */}
      <CreateTrainingDialog
        open={activeSheet === 'training'}
        onOpenChange={(open) => !open && setActiveSheet(null)}
      />

      <CreateMeasurementSheet
        open={activeSheet === 'measurement'}
        onOpenChange={(open) => !open && setActiveSheet(null)}
        onSubmit={handleCreateMeasurement}
        isLoading={createMeasurement.isPending}
        clients={clients}
      />

      <CreateDiagnosticSheet
        open={activeSheet === 'diagnostic'}
        onOpenChange={(open) => !open && setActiveSheet(null)}
        clients={clients}
      />

      <UnifiedCreditModal
        open={activeSheet === 'credit'}
        onOpenChange={(open) => !open && setActiveSheet(null)}
        showTrigger={false}
      />

      <NewSaleDialog
        open={activeSheet === 'sale'}
        onOpenChange={(open) => !open && setActiveSheet(null)}
      />

      <AddPerformanceSheet
        open={activeSheet === 'performance'}
        onOpenChange={(open) => !open && setActiveSheet(null)}
      />

      <CreateClientSheet
        open={activeSheet === 'client'}
        onOpenChange={(open) => !open && setActiveSheet(null)}
        onSubmit={async () => {
          setActiveSheet(null);
        }}
      />

      <PreDiagnosticInviteDialog
        open={activeSheet === 'prediagnostic'}
        onOpenChange={(open) => !open && setActiveSheet(null)}
      />

      <ExerciseFormDialog
        open={activeSheet === 'exercise'}
        onOpenChange={(open) => !open && setActiveSheet(null)}
      />

      <QuickLogDialog
        open={activeSheet === 'performance'}
        onOpenChange={(open) => !open && setActiveSheet(null)}
      />
    </>
  );
}
