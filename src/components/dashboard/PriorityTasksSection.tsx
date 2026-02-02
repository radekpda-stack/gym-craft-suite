import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight,
  X,
  Wallet,
  MessageSquare,
  Clock,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { DashboardViewModel, PriorityTask, dismissTask } from '@/hooks/useDashboardViewModel';
import { useQueryClient } from '@tanstack/react-query';
import { STATUS_CONFIG, Status } from '@/lib/statusUtils';
import { UnpaidTrainingsDialog } from './UnpaidTrainingsDialog';

interface PriorityTasksSectionProps {
  data: DashboardViewModel | undefined;
  isLoading: boolean;
}

const TASK_TYPE_CONFIG = {
  overload: { icon: AlertTriangle, label: 'Přetížení' },
  credit: { icon: Wallet, label: 'Kredit' },
  feedback: { icon: MessageSquare, label: 'Zpětná vazba' },
  unpaid: { icon: Clock, label: 'Platba' },
} as const;

// Map task severity to unified Status
const severityToStatus: Record<'ok' | 'warning' | 'error', Status> = {
  ok: 'ok',
  warning: 'warning',
  error: 'error',
};

interface TaskCardProps {
  task: PriorityTask;
  onDismiss: () => void;
  onClick: () => void;
}

function TaskCard({ task, onDismiss, onClick }: TaskCardProps) {
  const typeConfig = TASK_TYPE_CONFIG[task.type];
  const status = severityToStatus[task.severity];
  const config = STATUS_CONFIG[status];
  const Icon = typeConfig.icon;

  return (
    <div
      className={cn(
        'relative p-4 rounded-2xl border-2 transition-all group',
        config.borderClass,
        config.hoverBorderClass,
        'cursor-pointer'
      )}
      onClick={onClick}
    >
      {/* Dismiss button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="absolute top-2 right-2 p-1.5 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-secondary/80 transition-all z-10"
        title="Skrýt na 24h"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className={cn('p-2.5 rounded-xl shrink-0', config.bgClass)}>
          <Icon className={cn('w-5 h-5', config.textClass)} />
        </div>
        
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              'text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full',
              config.bgClass,
              config.textClass
            )}>
              {typeConfig.label}
            </span>
          </div>
          
          <p className="font-medium text-foreground text-sm leading-snug">
            {task.title}
          </p>
          
          {task.clientName && (
            <p className="text-xs text-muted-foreground mt-1">
              {task.clientName}
            </p>
          )}
        </div>
        
        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-2 opacity-50 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

function SuccessState({ messages }: { messages: string[] }) {
  const okConfig = STATUS_CONFIG.ok;
  
  return (
    <div className="text-center py-10">
      <div className="relative inline-flex">
        <div className={cn('absolute inset-0 rounded-full blur-xl', okConfig.bgClassStrong)} />
        <div className={cn('relative p-4 rounded-full', okConfig.bgClass)}>
          <Sparkles className={cn('w-8 h-8', okConfig.textClass)} />
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mt-4">
        Vše v pořádku!
      </h3>
      
      <div className="mt-3 space-y-1">
        {messages.map((msg, i) => (
          <p key={i} className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <CheckCircle2 className={cn('w-4 h-4', okConfig.textClass)} />
            {msg}
          </p>
        ))}
      </div>
    </div>
  );
}

export function PriorityTasksSection({ data, isLoading }: PriorityTasksSectionProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showUnpaidDialog, setShowUnpaidDialog] = useState(false);
  
  const handleDismiss = (taskId: string) => {
    dismissTask(taskId);
    queryClient.invalidateQueries({ queryKey: ['dashboard-view-model'] });
  };

  const handleTaskClick = (task: PriorityTask) => {
    if (task.type === 'unpaid') {
      // Count all unpaid tasks
      const unpaidTasks = data?.priorityTasks.filter(t => t.type === 'unpaid') || [];
      
      if (unpaidTasks.length === 1 && task.meta?.trainingId) {
        // Single unpaid training -> navigate directly
        navigate(`/trainings/${task.meta.trainingId}`);
      } else {
        // Multiple unpaid trainings -> open dialog
        setShowUnpaidDialog(true);
      }
    } else if (task.clientId) {
      navigate(`/clients/${task.clientId}`);
    }
  };
  
  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!data) return null;
  
  const { priorityTasks, totalTasksCount, allClear, successMessages } = data;
  const okConfig = STATUS_CONFIG.ok;
  const warningConfig = STATUS_CONFIG.warning;

  return (
    <Card className="glass overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {allClear ? (
              <>
                <CheckCircle2 className={cn('w-5 h-5', okConfig.textClass)} />
                Vše vyřešeno
              </>
            ) : (
              <>
                <AlertTriangle className={cn('w-5 h-5', warningConfig.textClass)} />
                Co teď?
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {totalTasksCount} {totalTasksCount === 1 ? 'úkol' : totalTasksCount < 5 ? 'úkoly' : 'úkolů'}
                </span>
              </>
            )}
          </CardTitle>
          
          {!allClear && priorityTasks.length < totalTasksCount && (
            <Button variant="ghost" size="sm" onClick={() => navigate('/clients')}>
              Zobrazit vše
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {allClear ? (
          <SuccessState messages={successMessages} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {priorityTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onDismiss={() => handleDismiss(task.id)}
                onClick={() => handleTaskClick(task)}
              />
            ))}
          </div>
        )}
      </CardContent>

      <UnpaidTrainingsDialog 
        open={showUnpaidDialog} 
        onOpenChange={setShowUnpaidDialog} 
      />
    </Card>
  );
}
