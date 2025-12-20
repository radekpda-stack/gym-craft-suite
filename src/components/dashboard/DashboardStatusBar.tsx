import { useState } from 'react';
import { 
  Plus, 
  Search,
  Wallet,
  Clock,
  Users,
  Banknote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { CreateTrainingSheet } from '@/components/trainings/CreateTrainingSheet';
import { CommandPalette } from '@/components/search/CommandPalette';
import { useClients } from '@/hooks/useClients';
import { useCreateTrainingSession } from '@/hooks/useTrainingSessions';
import { useFeatureTracking } from '@/hooks/useFeatureTracking';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { DashboardViewModel, DayStatus } from '@/hooks/useDashboardViewModel';
import { STATUS_CONFIG, Status } from '@/lib/statusUtils';

interface DashboardStatusBarProps {
  data: DashboardViewModel | undefined;
  isLoading: boolean;
}

// Map DayStatus to unified Status type
const dayStatusToStatus: Record<DayStatus, Status> = {
  ok: 'ok',
  warning: 'warning',
  critical: 'error',
};

function StatusIndicator({ status }: { status: DayStatus }) {
  const unifiedStatus = dayStatusToStatus[status];
  const config = STATUS_CONFIG[unifiedStatus];
  const Icon = config.icon;
  
  return (
    <div className={cn(
      'flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-medium shrink-0',
      config.bgClassStrong,
      config.textClass
    )}>
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{config.labelShort}</span>
    </div>
  );
}

interface MetricChipProps {
  icon: typeof Wallet;
  label: string;
  value: string | number;
  subValue?: string;
  warning?: boolean;
  error?: boolean;
  onClick?: () => void;
}

function MetricChip({ icon: Icon, label, value, subValue, warning, error, onClick }: MetricChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 h-9 px-3 rounded-full text-sm transition-colors shrink-0',
        'bg-secondary/50 hover:bg-secondary',
        error && 'ring-1 ring-status-error/30',
        warning && !error && 'ring-1 ring-status-warning/30'
      )}
    >
      <Icon className={cn(
        'w-4 h-4 shrink-0',
        error ? 'text-status-error' : warning ? 'text-status-warning' : 'text-muted-foreground'
      )} />
      <div className="flex items-center gap-1.5">
        <span className="font-medium text-foreground">{value}</span>
        {subValue && (
          <span className={cn(
            'text-xs',
            error ? 'text-status-error' : warning ? 'text-status-warning' : 'text-muted-foreground'
          )}>
            {subValue}
          </span>
        )}
      </div>
      <span className="text-xs text-muted-foreground hidden sm:inline">{label}</span>
    </button>
  );
}

export function DashboardStatusBar({ data, isLoading }: DashboardStatusBarProps) {
  const { trackFeature } = useFeatureTracking();
  const { data: clients = [] } = useClients();
  const createTraining = useCreateTrainingSession();
  
  const [showTrainingSheet, setShowTrainingSheet] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showUnpaidDialog, setShowUnpaidDialog] = useState(false);
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  
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
      <div className="sticky top-0 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
          <div className="flex-1" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { dayStatus, capacity, finance, todayEstimatedIncome, uniqueClientsToday } = data;

  return (
    <>
      <div className="sticky top-0 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {/* Day Status Indicator */}
          <StatusIndicator status={dayStatus} />
          
          {/* Capacity */}
          <MetricChip
            icon={Users}
            label="Dnes tréninků"
            value={`${capacity.completed}/${capacity.total}`}
            subValue={uniqueClientsToday > 1 ? `(${uniqueClientsToday} klientů)` : undefined}
          />
          
          {/* Estimated Income Today */}
          {todayEstimatedIncome > 0 && (
            <MetricChip
              icon={Banknote}
              label="Příjem dnes"
              value={formatCurrency(todayEstimatedIncome)}
            />
          )}
          
          {/* Unpaid */}
          {finance.unpaidTotal.count > 0 && (
            <MetricChip
              icon={Clock}
              label="Nezaplaceno"
              value={finance.unpaidTotal.count}
              subValue={formatCurrency(finance.unpaidTotal.amount)}
              warning={finance.unpaidTotal.count > 0 && finance.unpaidTotal.count <= 3}
              error={finance.unpaidTotal.count > 3}
              onClick={() => setShowUnpaidDialog(true)}
            />
          )}
          
          {/* Low Credit */}
          {finance.creditAtRisk.count > 0 && (
            <MetricChip
              icon={Wallet}
              label="Nízký kredit"
              value={finance.creditAtRisk.count}
              warning
              onClick={() => setShowCreditDialog(true)}
            />
          )}
          
          <div className="flex-1" />
          
          {/* Actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSearch(true)}
            className="gap-2 shrink-0 h-9 rounded-full"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Hledat</span>
          </Button>
          
          <Button
            size="sm"
            onClick={() => setShowTrainingSheet(true)}
            className="gap-2 shrink-0 h-9 rounded-full"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nový trénink</span>
            <span className="sm:hidden">Nový</span>
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
      
      {/* Unpaid Detail Dialog */}
      <Dialog open={showUnpaidDialog} onOpenChange={setShowUnpaidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[hsl(38_92%_50%)]" />
              Nezaplacené tréninky
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-3xl font-bold text-foreground">
              {formatCurrency(finance.unpaidTotal.amount)}
            </p>
            <p className="text-muted-foreground mt-1">
              {finance.unpaidTotal.count} nezaplacených tréninků
            </p>
            <Button 
              className="mt-4" 
              onClick={() => {
                setShowUnpaidDialog(false);
                window.location.href = '/clients?filter=unpaid';
              }}
            >
              Zobrazit klienty
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Credit Detail Dialog */}
      <Dialog open={showCreditDialog} onOpenChange={setShowCreditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[hsl(38_92%_50%)]" />
              Klienti s nízkým kreditem
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-3xl font-bold text-foreground">
              {finance.creditAtRisk.count}
            </p>
            <p className="text-muted-foreground mt-1">
              klientů potřebuje doplnit kredit
            </p>
            <Button 
              className="mt-4" 
              onClick={() => {
                setShowCreditDialog(false);
                window.location.href = '/clients?filter=lowcredit';
              }}
            >
              Zobrazit klienty
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
