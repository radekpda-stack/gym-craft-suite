import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  X,
  UserPlus,
  Dumbbell,
  Activity,
  Stethoscope,
  Wallet,
  ShoppingBag,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateClientSheet } from '@/components/clients/CreateClientSheet';
import { CreateTrainingDialog } from '@/components/trainings/CreateTrainingDialog';
import { CreateMeasurementSheet } from '@/components/measurements/CreateMeasurementSheet';
import { CreateDiagnosticSheet } from '@/components/diagnostics/CreateDiagnosticSheet';
import { EnhancedCreditModal } from '@/components/credit/EnhancedCreditModal';
import { NewSaleDialog } from '@/components/sales/NewSaleDialog';
import { useClients, useCreateClient } from '@/hooks/useClients';
import { useCreateTrainingSession } from '@/hooks/useTrainingSessions';
import { useAddTrainingSessionTags } from '@/hooks/useTrainingSessionTags';
import { useTrainingPrices } from '@/hooks/useAppSettings';
import { useCreateMeasurement } from '@/hooks/useMeasurements';
import { EnhancedTrainingFormValues } from '@/components/trainings/EnhancedTrainingForm';
import { featureTracker } from '@/hooks/useFeatureTracking';

interface QuickAction {
  id: string;
  icon: LucideIcon;
  label: string;
  color: string;
}

const quickActions: QuickAction[] = [
  { id: 'client', icon: UserPlus, label: 'Nový klient', color: 'bg-blue-500' },
  { id: 'training', icon: Dumbbell, label: 'Nový trénink', color: 'bg-primary' },
  { id: 'measurement', icon: Activity, label: 'Nové měření', color: 'bg-green-500' },
  { id: 'diagnostic', icon: Stethoscope, label: 'Nová diagnostika', color: 'bg-purple-500' },
  { id: 'credit', icon: Wallet, label: 'Dobít kredit', color: 'bg-amber-500' },
  { id: 'sale', icon: ShoppingBag, label: 'Nový prodej', color: 'bg-pink-500' },
];

export function QuickActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const { data: clients = [] } = useClients();
  const createClient = useCreateClient();
  const createTraining = useCreateTrainingSession();
  const addTrainingTags = useAddTrainingSessionTags();
  const trainingPrices = useTrainingPrices();
  const createMeasurement = useCreateMeasurement();

  const handleAction = (actionId: string) => {
    featureTracker.track(`fab_action_${actionId}`, 'navigation');
    setIsOpen(false);
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

  const handleCreateClient = async (data: any) => {
    await createClient.mutateAsync(data);
    setActiveSheet(null);
  };

  const handleCreateMeasurement = async (data: any): Promise<string | void> => {
    const result = await createMeasurement.mutateAsync(data);
    setActiveSheet(null);
    return result?.id;
  };


  return (
    <>
      {/* FAB Button */}
      <div className="fixed bottom-24 right-4 z-50 md:bottom-6 lg:right-6">
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
                {quickActions.map((action, index) => (
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
      <CreateClientSheet
        open={activeSheet === 'client'}
        onOpenChange={(open) => !open && setActiveSheet(null)}
        onSubmit={handleCreateClient}
        isLoading={createClient.isPending}
      />

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

      <EnhancedCreditModal
        open={activeSheet === 'credit'}
        onOpenChange={(open) => !open && setActiveSheet(null)}
        showTrigger={false}
      />

      <NewSaleDialog
        open={activeSheet === 'sale'}
        onOpenChange={(open) => !open && setActiveSheet(null)}
      />
    </>
  );
}
