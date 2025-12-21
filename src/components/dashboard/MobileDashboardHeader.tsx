import { useState } from 'react';
import { AlertTriangle, Users, Banknote } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { DashboardViewModel, DayStatus } from '@/hooks/useDashboardViewModel';
import { STATUS_CONFIG, Status } from '@/lib/statusUtils';
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

// Map DayStatus to unified Status type
const dayStatusToStatus: Record<DayStatus, Status> = {
  ok: 'ok',
  warning: 'warning',
  critical: 'error',
};

export function MobileDashboardHeader({ data, isLoading }: MobileDashboardHeaderProps) {
  const [showTasksDialog, setShowTasksDialog] = useState(false);

  if (isLoading) {
    return (
      <div className="sm:hidden sticky top-0 z-40 -mx-4 px-4 py-2 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 w-12 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { dayStatus, todayEstimatedIncome, capacity, priorityTasks } = data;
  const unifiedStatus = dayStatusToStatus[dayStatus];
  const config = STATUS_CONFIG[unifiedStatus];
  const StatusIcon = config.icon;

  const criticalTasksCount = priorityTasks.filter(t => t.severity === 'error').length;
  const totalTasksCount = priorityTasks.length;

  return (
    <>
      {/* Mobile-only compact header with 4 metrics */}
      <div className="sm:hidden sticky top-0 z-40 -mx-4 px-4 py-2 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-2">
          {/* Status Icon */}
          <div className={cn(
            'flex items-center justify-center w-9 h-9 rounded-full shrink-0',
            config.bgClassStrong
          )}>
            <StatusIcon className={cn('w-4 h-4', config.textClass)} />
          </div>
          
          {/* Trainings today */}
          <div className="flex flex-col items-center justify-center h-9 px-3 rounded-lg bg-secondary/50 min-w-0">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3 text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">
                {capacity.completed}/{capacity.total}
              </span>
            </div>
            <span className="text-[9px] text-muted-foreground -mt-0.5">dnes</span>
          </div>
          
          {/* Today's income */}
          <div className="flex-1 flex flex-col items-center justify-center h-9 px-3 rounded-lg bg-secondary/50 min-w-0">
            <div className="flex items-center gap-1">
              <Banknote className="w-3 h-3 text-muted-foreground" />
              <span className="text-sm font-bold text-foreground truncate">
                {formatCurrency(todayEstimatedIncome)}
              </span>
            </div>
            <span className="text-[9px] text-muted-foreground -mt-0.5">příjem</span>
          </div>
          
          {/* Critical tasks - only show if there are tasks */}
          {totalTasksCount > 0 && (
            <button
              onClick={() => setShowTasksDialog(true)}
              className={cn(
                'flex flex-col items-center justify-center h-9 px-3 rounded-lg min-w-0 transition-colors',
                criticalTasksCount > 0 
                  ? 'bg-status-error/10 ring-1 ring-status-error/30' 
                  : 'bg-status-warning/10'
              )}
            >
              <div className="flex items-center gap-1">
                <AlertTriangle className={cn(
                  'w-3 h-3',
                  criticalTasksCount > 0 ? 'text-status-error' : 'text-status-warning'
                )} />
                <span className={cn(
                  'text-sm font-bold',
                  criticalTasksCount > 0 ? 'text-status-error' : 'text-status-warning'
                )}>
                  {totalTasksCount}
                </span>
              </div>
              <span className="text-[9px] text-muted-foreground -mt-0.5">úkoly</span>
            </button>
          )}
        </div>
      </div>

      {/* Tasks Dialog */}
      <Dialog open={showTasksDialog} onOpenChange={setShowTasksDialog}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-status-warning" />
              Prioritní úkoly ({totalTasksCount})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {priorityTasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  'p-3 rounded-lg border',
                  task.severity === 'error' 
                    ? 'bg-status-error/5 border-status-error/20'
                    : 'bg-status-warning/5 border-status-warning/20'
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
