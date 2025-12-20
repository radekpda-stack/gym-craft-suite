import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateTrainingSheet } from '@/components/trainings/CreateTrainingSheet';
import { CommandPalette } from '@/components/search/CommandPalette';
import { useClients } from '@/hooks/useClients';
import { useCreateTrainingSession } from '@/hooks/useTrainingSessions';
import { useFeatureTracking } from '@/hooks/useFeatureTracking';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { DashboardViewModel, DayStatus } from '@/hooks/useDashboardViewModel';
import { 
  CheckCircle2,
  AlertCircle,
  XCircle,
} from 'lucide-react';

interface MobileDashboardHeaderProps {
  data: DashboardViewModel | undefined;
  isLoading: boolean;
}

const DAY_STATUS_CONFIG: Record<DayStatus, { 
  icon: typeof CheckCircle2; 
  bgClass: string;
  textClass: string;
}> = {
  ok: { 
    icon: CheckCircle2, 
    bgClass: 'bg-[hsl(142_76%_36%/0.2)]',
    textClass: 'text-[hsl(142_76%_36%)]',
  },
  warning: { 
    icon: AlertCircle, 
    bgClass: 'bg-[hsl(38_92%_50%/0.2)]',
    textClass: 'text-[hsl(38_92%_50%)]',
  },
  critical: { 
    icon: XCircle, 
    bgClass: 'bg-destructive/20',
    textClass: 'text-destructive',
  },
};

export function MobileDashboardHeader({ data, isLoading }: MobileDashboardHeaderProps) {
  const { trackFeature } = useFeatureTracking();
  const { data: clients = [] } = useClients();
  const createTraining = useCreateTrainingSession();
  
  const [showTrainingSheet, setShowTrainingSheet] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  const handleCreateTraining = async (formData: any) => {
    try {
      await createTraining.mutateAsync(formData);
      setShowTrainingSheet(false);
      trackFeature('create_training', 'trainings');
    } catch (error) {
      console.error('Error creating training:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="sm:hidden sticky top-0 z-40 -mx-4 px-4 py-3 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { dayStatus, todayEstimatedIncome } = data;
  const config = DAY_STATUS_CONFIG[dayStatus];
  const StatusIcon = config.icon;

  return (
    <>
      {/* Mobile-only compact header */}
      <div className="sm:hidden sticky top-0 z-40 -mx-4 px-4 py-2 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-3">
          {/* Status Icon */}
          <div className={cn(
            'flex items-center justify-center w-10 h-10 rounded-full shrink-0',
            config.bgClass
          )}>
            <StatusIcon className={cn('w-5 h-5', config.textClass)} />
          </div>
          
          {/* Main metric - Today's income */}
          <button 
            onClick={() => setShowSearch(true)}
            className="flex-1 flex flex-col items-center justify-center h-12 rounded-xl bg-secondary/50 active:bg-secondary transition-colors"
          >
            <span className="text-lg font-bold text-foreground">
              {formatCurrency(todayEstimatedIncome)}
            </span>
            <span className="text-[10px] text-muted-foreground -mt-0.5">
              Příjem dnes
            </span>
          </button>
          
          {/* Quick action - New training */}
          <Button
            size="icon"
            onClick={() => setShowTrainingSheet(true)}
            className="w-12 h-12 rounded-full shrink-0 shadow-lg"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      </div>
      
      {/* Dialogs */}
      <CreateTrainingSheet
        open={showTrainingSheet}
        onOpenChange={setShowTrainingSheet}
        onSubmit={handleCreateTraining}
        clients={clients}
        isLoading={createTraining.isPending}
      />
      
      <CommandPalette 
        open={showSearch} 
        onOpenChange={setShowSearch} 
      />
    </>
  );
}
