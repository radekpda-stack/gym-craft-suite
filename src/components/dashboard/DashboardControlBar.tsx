import { useState } from 'react';
import { 
  Plus, 
  Search,
  Wallet,
  Clock,
  Users,
  Banknote,
  Dumbbell,
  CalendarX,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
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
import { useClientsAtRisk } from '@/hooks/useClientsAtRisk';
import { useDashboardKPIs } from '@/hooks/useDashboardKPIs';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { DashboardViewModel, DayStatus } from '@/hooks/useDashboardViewModel';
import { STATUS_CONFIG, Status } from '@/lib/statusUtils';

interface DashboardControlBarProps {
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
      'flex items-center gap-1.5 h-8 px-2.5 rounded-full text-xs font-medium shrink-0',
      config.bgClassStrong,
      config.textClass
    )}>
      <Icon className="w-3.5 h-3.5" />
      <span>{config.labelShort}</span>
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
  className?: string;
}

function MetricChip({ icon: Icon, label, value, subValue, warning, error, onClick, className }: MetricChipProps) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'flex items-center gap-1.5 h-8 px-2.5 rounded-full text-xs transition-colors shrink-0',
        'bg-secondary/50',
        onClick && 'hover:bg-secondary cursor-pointer',
        !onClick && 'cursor-default',
        error && 'ring-1 ring-status-error/30',
        warning && !error && 'ring-1 ring-status-warning/30',
        className
      )}
    >
      <Icon className={cn(
        'w-3.5 h-3.5 shrink-0',
        error ? 'text-status-error' : warning ? 'text-status-warning' : 'text-muted-foreground'
      )} />
      <span className="font-medium text-foreground">{value}</span>
      {subValue && (
        <span className={cn(
          'text-[10px]',
          error ? 'text-status-error' : warning ? 'text-status-warning' : 'text-muted-foreground'
        )}>
          {subValue}
        </span>
      )}
      <span className="text-[10px] text-muted-foreground hidden lg:inline">{label}</span>
    </button>
  );
}

function TrendIndicator({ value, inverted = false }: { value: number; inverted?: boolean }) {
  if (value === 0) return null;
  
  const isPositive = inverted ? value < 0 : value > 0;
  const Icon = value > 0 ? TrendingUp : TrendingDown;
  
  return (
    <span className={cn(
      'flex items-center gap-0.5 text-[10px] font-medium',
      isPositive ? 'text-emerald-500' : 'text-destructive'
    )}>
      <Icon className="w-3 h-3" />
      {value > 0 ? '+' : ''}{value}%
    </span>
  );
}

export function DashboardControlBar({ data, isLoading }: DashboardControlBarProps) {
  const { trackFeature } = useFeatureTracking();
  const { data: clients = [] } = useClients();
  const { data: clientsAtRisk = [] } = useClientsAtRisk();
  const { data: kpis } = useDashboardKPIs();
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
      <div className="sticky top-0 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
            <div className="flex-1" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { dayStatus, capacity, finance, todayEstimatedIncome, uniqueClientsToday, weeklySummary, trends } = data;

  // Calculate week change percentages
  const getWeekChangePercent = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const trainingsWeekChange = getWeekChangePercent(weeklySummary.trainingsThisWeek, weeklySummary.trainingsLastWeek);
  const incomeWeekChange = getWeekChangePercent(weeklySummary.incomeThisWeek, weeklySummary.incomeLastWeek);

  return (
    <>
      <div className="sticky top-0 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="space-y-1.5">
          {/* Row 1: Day status + Today metrics + Actions */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <StatusIndicator status={dayStatus} />
            
            <MetricChip
              icon={Users}
              label="Dnes"
              value={`${capacity.completed}/${capacity.total}`}
              subValue={uniqueClientsToday > 1 ? `(${uniqueClientsToday})` : undefined}
            />
            
            {todayEstimatedIncome > 0 && (
              <MetricChip
                icon={Banknote}
                label="Příjem"
                value={formatCurrency(todayEstimatedIncome)}
              />
            )}
            
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
            
            {finance.creditAtRisk.count > 0 && (
              <MetricChip
                icon={Wallet}
                label="Kredit"
                value={finance.creditAtRisk.count}
                warning
                onClick={() => setShowCreditDialog(true)}
              />
            )}
            
            <div className="flex-1" />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSearch(true)}
              className="gap-1.5 shrink-0 h-8 rounded-full px-3"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs">Hledat</span>
            </Button>
            
            <Button
              size="sm"
              onClick={() => setShowTrainingSheet(true)}
              className="gap-1.5 shrink-0 h-8 rounded-full px-3"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="text-xs">Nový</span>
            </Button>
          </div>

          {/* Row 2: Weekly stats + Trends */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-blue-500/10 text-xs shrink-0">
              <Dumbbell className="w-3.5 h-3.5 text-blue-500" />
              <span className="font-medium text-foreground">{weeklySummary.trainingsThisWeek}</span>
              <span className="text-muted-foreground hidden sm:inline">týden</span>
              <TrendIndicator value={trainingsWeekChange} />
            </div>
            
            <div className="flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-emerald-500/10 text-xs shrink-0">
              <Wallet className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-medium text-foreground">{formatCurrency(weeklySummary.incomeThisWeek)}</span>
              <span className="text-muted-foreground hidden sm:inline">týden</span>
              <TrendIndicator value={incomeWeekChange} />
            </div>
            
            <div className={cn(
              'flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs shrink-0',
              trends.cancellationRate > 10 ? 'bg-destructive/10' : 'bg-secondary/30'
            )}>
              <CalendarX className={cn(
                'w-3.5 h-3.5',
                trends.cancellationRate > 10 ? 'text-destructive' : 'text-muted-foreground'
              )} />
              <span className="font-medium text-foreground">{trends.cancellationRate}%</span>
              <span className="text-muted-foreground hidden sm:inline">zrušeno</span>
            </div>
            
            {clientsAtRisk.length > 0 && (
              <div className="flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-status-warning/10 text-xs shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 text-status-warning" />
                <span className="font-medium text-foreground">{clientsAtRisk.length}</span>
                <span className="text-muted-foreground hidden sm:inline">rizikoví</span>
              </div>
            )}
          </div>
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
              <Clock className="w-5 h-5 text-status-warning" />
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
              <Wallet className="w-5 h-5 text-status-warning" />
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
