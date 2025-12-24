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
import { useToast } from '@/hooks/use-toast';
import { useClientsAtRisk } from '@/hooks/useClientsAtRisk';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { DashboardViewModel, DayStatus } from '@/hooks/useDashboardViewModel';

interface DashboardControlBarProps {
  data: DashboardViewModel | undefined;
  isLoading: boolean;
}

// Status tint classes for ambient background
const statusTintClasses: Record<DayStatus, string> = {
  ok: '',
  warning: 'status-tint-warning',
  critical: 'status-tint-critical',
};

function StatusDot({ status }: { status: DayStatus }) {
  return (
    <div className={cn(
      'status-dot',
      status === 'ok' && 'status-dot-ok',
      status === 'warning' && 'status-dot-warning',
      status === 'critical' && 'status-dot-error'
    )} />
  );
}

// Minimal trend arrow - just ↑ or ↓
function TrendArrow({ value }: { value: number }) {
  if (value === 0) return null;
  const Icon = value > 0 ? TrendingUp : TrendingDown;
  return (
    <Icon className={cn(
      'w-3 h-3',
      value > 0 ? 'text-emerald-400/70' : 'text-red-400/70'
    )} />
  );
}

// Metric instrument - like a dashboard gauge
interface MetricProps {
  icon: typeof Wallet;
  value: string | number;
  label?: string;
  trend?: number;
  warning?: boolean;
  error?: boolean;
  onClick?: () => void;
}

function Metric({ icon: Icon, value, label, trend, warning, error, onClick }: MetricProps) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'metric-instrument h-12 px-4 gap-2 flex-row',
        onClick && 'cursor-pointer',
        !onClick && 'cursor-default'
      )}
    >
      <Icon className={cn(
        'w-4 h-4',
        error ? 'text-red-400' : warning ? 'text-amber-400' : 'text-muted-foreground/60'
      )} />
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-semibold text-foreground">{value}</span>
        {trend !== undefined && <TrendArrow value={trend} />}
      </div>
      {label && (
        <span className="text-[10px] text-muted-foreground hidden lg:block">{label}</span>
      )}
    </button>
  );
}

// Capacity ring - progress indicator
function CapacityRing({ completed, total }: { completed: number; total: number }) {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="metric-instrument h-12 px-4 gap-3 flex-row">
      <div className="relative w-10 h-10 flex items-center justify-center">
        <svg className="w-10 h-10 progress-ring" viewBox="0 0 44 44">
          {/* Background circle */}
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke="hsl(220 15% 20% / 0.5)"
            strokeWidth="3"
          />
          {/* Progress circle */}
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke="hsl(220 60% 60%)"
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <span className="absolute text-xs font-semibold text-foreground">
          {completed}
        </span>
      </div>
      <div className="flex flex-col items-start">
        <span className="text-sm font-medium text-foreground">/{total}</span>
        <span className="text-[10px] text-muted-foreground">dnes</span>
      </div>
    </div>
  );
}

export function DashboardControlBar({ data, isLoading }: DashboardControlBarProps) {
  const { trackFeature } = useFeatureTracking();
  const { toast } = useToast();
  const { data: clients = [] } = useClients();
  const { data: clientsAtRisk = [] } = useClientsAtRisk();
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
      toast({ title: 'Trénink vytvořen' });
    } catch (error) {
      console.error('Error creating training:', error);
      toast({ title: 'Chyba při vytváření tréninku', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="sticky top-0 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3">
        <div className="premium-layer p-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-24 rounded-2xl" />
            <Skeleton className="h-12 w-28 rounded-2xl" />
            <Skeleton className="h-12 w-20 rounded-2xl" />
            <div className="flex-1" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { dayStatus, capacity, finance, todayEstimatedIncome, weeklySummary, trends } = data;

  // Calculate week change percentages
  const getWeekChangePercent = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const trainingsWeekChange = getWeekChangePercent(weeklySummary.trainingsThisWeek, weeklySummary.trainingsLastWeek);
  const incomeWeekChange = getWeekChangePercent(weeklySummary.incomeThisWeek, weeklySummary.incomeLastWeek);

  return (
    <>
      {/* Main control bar with ambient status tint */}
      <div className={cn(
        'sticky top-0 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3',
        statusTintClasses[dayStatus]
      )}>
        <div className="premium-layer p-3">
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
            {/* Status dot - the only colored element when OK */}
            <div className="flex items-center gap-2 shrink-0">
              <StatusDot status={dayStatus} />
            </div>
            
            {/* Capacity ring */}
            <CapacityRing completed={capacity.completed} total={capacity.total} />
            
            {/* Today's income */}
            {todayEstimatedIncome > 0 && (
              <Metric
                icon={Banknote}
                value={formatCurrency(todayEstimatedIncome)}
              />
            )}
            
            {/* Weekly trainings with trend */}
            <Metric
              icon={Dumbbell}
              value={weeklySummary.trainingsThisWeek}
              label="týden"
              trend={trainingsWeekChange}
            />
            
            {/* Weekly income with trend */}
            <Metric
              icon={Wallet}
              value={formatCurrency(weeklySummary.incomeThisWeek)}
              trend={incomeWeekChange}
            />
            
            {/* Problems - only show when exist */}
            {finance.unpaidTotal.count > 0 && (
              <Metric
                icon={Clock}
                value={finance.unpaidTotal.count}
                warning={finance.unpaidTotal.count <= 3}
                error={finance.unpaidTotal.count > 3}
                onClick={() => setShowUnpaidDialog(true)}
              />
            )}
            
            {finance.creditAtRisk.count > 0 && (
              <Metric
                icon={AlertTriangle}
                value={finance.creditAtRisk.count}
                warning
                onClick={() => setShowCreditDialog(true)}
              />
            )}
            
            {clientsAtRisk.length > 0 && (
              <Metric
                icon={Users}
                value={clientsAtRisk.length}
                warning
              />
            )}
            
            {trends.cancellationRate > 5 && (
              <Metric
                icon={CalendarX}
                value={`${trends.cancellationRate}%`}
                warning={trends.cancellationRate > 5}
                error={trends.cancellationRate > 15}
              />
            )}
            
            <div className="flex-1 min-w-4" />
            
            {/* Actions - minimal style */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(true)}
              className="h-10 w-10 rounded-full shrink-0 premium-hover"
            >
              <Search className="w-4 h-4 text-muted-foreground" />
            </Button>
            
            <Button
              size="icon"
              onClick={() => setShowTrainingSheet(true)}
              className="h-10 w-10 rounded-full shrink-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
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
      
      {/* Unpaid Dialog - minimal style */}
      <Dialog open={showUnpaidDialog} onOpenChange={setShowUnpaidDialog}>
        <DialogContent className="premium-layer border-0">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Nezaplacené tréninky
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <p className="text-4xl font-semibold text-foreground">
              {formatCurrency(finance.unpaidTotal.amount)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {finance.unpaidTotal.count} položek
            </p>
            <Button 
              className="mt-6" 
              onClick={() => {
                setShowUnpaidDialog(false);
                window.location.href = '/clients?filter=unpaid';
              }}
            >
              Zobrazit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Credit Dialog */}
      <Dialog open={showCreditDialog} onOpenChange={setShowCreditDialog}>
        <DialogContent className="premium-layer border-0">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Nízký kredit
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <p className="text-4xl font-semibold text-foreground">
              {finance.creditAtRisk.count}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              klientů
            </p>
            <Button 
              className="mt-6" 
              onClick={() => {
                setShowCreditDialog(false);
                window.location.href = '/clients?filter=lowcredit';
              }}
            >
              Zobrazit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
