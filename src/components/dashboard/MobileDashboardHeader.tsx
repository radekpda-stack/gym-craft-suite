import { useState } from 'react';
import { AlertTriangle, Banknote } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { DashboardViewModel, DayStatus } from '@/hooks/useDashboardViewModel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MobileDashboardHeaderProps {
  data: DashboardViewModel | undefined;
  isLoading: boolean;
}

// Status tint for ambient background
const statusTintClasses: Record<DayStatus, string> = {
  ok: '',
  warning: 'status-tint-warning',
  critical: 'status-tint-critical',
};

export function MobileDashboardHeader({ data, isLoading }: MobileDashboardHeaderProps) {
  const [showTasksDialog, setShowTasksDialog] = useState(false);

  if (isLoading) {
    return (
      <div className="sm:hidden sticky top-0 z-40 -mx-4 px-4 py-3">
        <div className="premium-layer p-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-14 w-14 rounded-2xl" />
            <Skeleton className="h-14 flex-1 rounded-2xl" />
            <Skeleton className="h-14 w-14 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { dayStatus, todayEstimatedIncome, capacity, priorityTasks } = data;
  const criticalTasksCount = priorityTasks.filter(t => t.severity === 'error').length;
  const totalTasksCount = priorityTasks.length;

  // Progress percentage for capacity
  const capacityPercent = capacity.total > 0 ? (capacity.completed / capacity.total) * 100 : 0;

  return (
    <>
      {/* Mobile header - Watch/CarPlay style */}
      <div className={cn(
        'sm:hidden sticky top-0 z-40 -mx-4 px-4 py-3',
        statusTintClasses[dayStatus]
      )}>
        <div className="premium-layer p-3">
          <div className="flex items-center gap-3">
            {/* Capacity ring - large tappable */}
            <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
              <svg className="w-14 h-14 progress-ring" viewBox="0 0 56 56">
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  fill="none"
                  stroke="hsl(220 15% 20% / 0.5)"
                  strokeWidth="4"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  fill="none"
                  stroke={dayStatus === 'critical' ? 'hsl(0 70% 55%)' : dayStatus === 'warning' ? 'hsl(38 80% 50%)' : 'hsl(220 60% 60%)'}
                  strokeWidth="4"
                  strokeDasharray={2 * Math.PI * 24}
                  strokeDashoffset={2 * Math.PI * 24 * (1 - capacityPercent / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-base font-semibold text-foreground">{capacity.completed}</span>
                <span className="text-[10px] text-muted-foreground -mt-0.5">/{capacity.total}</span>
              </div>
            </div>
            
            {/* Today's income - primary metric */}
            <div className="flex-1 metric-instrument h-14 px-4">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-muted-foreground/60" />
                <span className="text-2xl font-semibold text-foreground">
                  {formatCurrency(todayEstimatedIncome)}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">příjem dnes</span>
            </div>
            
            {/* Tasks indicator - only show if tasks exist */}
            {totalTasksCount > 0 && (
              <button
                onClick={() => setShowTasksDialog(true)}
                className={cn(
                  'w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all duration-150',
                  criticalTasksCount > 0 
                    ? 'bg-red-500/10 border border-red-500/20' 
                    : 'bg-amber-500/10 border border-amber-500/20'
                )}
              >
                <AlertTriangle className={cn(
                  'w-5 h-5',
                  criticalTasksCount > 0 ? 'text-red-400' : 'text-amber-400'
                )} />
                <span className={cn(
                  'text-sm font-semibold mt-0.5',
                  criticalTasksCount > 0 ? 'text-red-400' : 'text-amber-400'
                )}>
                  {totalTasksCount}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tasks Dialog */}
      <Dialog open={showTasksDialog} onOpenChange={setShowTasksDialog}>
        <DialogContent className="premium-layer border-0 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Úkoly ({totalTasksCount})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {priorityTasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  'p-4 rounded-xl transition-all duration-150 premium-hover',
                  task.severity === 'error' 
                    ? 'bg-red-500/5 border-l-2 border-red-500/50'
                    : 'bg-amber-500/5 border-l-2 border-amber-500/50'
                )}
              >
                <p className="font-medium text-sm text-foreground">{task.title}</p>
                {task.subtitle && (
                  <p className="text-xs text-muted-foreground mt-1">{task.subtitle}</p>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
