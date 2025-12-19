import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2,
  ChevronRight,
  X,
  Wallet,
  MessageSquare,
  Clock,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { DashboardViewModel, PriorityTask, dismissTask } from '@/hooks/useDashboardViewModel';
import { useQueryClient } from '@tanstack/react-query';

interface PriorityTasksSectionProps {
  data: DashboardViewModel | undefined;
  isLoading: boolean;
}

const TASK_TYPE_CONFIG = {
  overload: { icon: AlertTriangle, label: 'Přetížení' },
  credit: { icon: Wallet, label: 'Kredit' },
  feedback: { icon: MessageSquare, label: 'Feedback' },
  unpaid: { icon: Clock, label: 'Platba' },
} as const;

const SEVERITY_CONFIG = {
  ok: {
    bgClass: 'bg-[hsl(142_76%_36%/0.08)]',
    borderClass: 'border-[hsl(142_76%_36%/0.2)]',
    textClass: 'text-[hsl(142_76%_36%)]',
    hoverClass: 'hover:border-[hsl(142_76%_36%/0.4)]',
  },
  warning: {
    bgClass: 'bg-[hsl(38_92%_50%/0.08)]',
    borderClass: 'border-[hsl(38_92%_50%/0.2)]',
    textClass: 'text-[hsl(38_92%_50%)]',
    hoverClass: 'hover:border-[hsl(38_92%_50%/0.4)]',
  },
  error: {
    bgClass: 'bg-destructive/8',
    borderClass: 'border-destructive/20',
    textClass: 'text-destructive',
    hoverClass: 'hover:border-destructive/40',
  },
};

interface TaskCardProps {
  task: PriorityTask;
  onDismiss: () => void;
  onClick: () => void;
}

function TaskCard({ task, onDismiss, onClick }: TaskCardProps) {
  const typeConfig = TASK_TYPE_CONFIG[task.type];
  const severityConfig = SEVERITY_CONFIG[task.severity];
  const Icon = typeConfig.icon;

  return (
    <div
      className={cn(
        'relative p-4 rounded-xl border-2 transition-all group',
        severityConfig.borderClass,
        severityConfig.hoverClass,
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
        className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-secondary/80 transition-all z-10"
        title="Skrýt na 24h"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className={cn('p-2.5 rounded-xl shrink-0', severityConfig.bgClass)}>
          <Icon className={cn('w-5 h-5', severityConfig.textClass)} />
        </div>
        
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              'text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full',
              severityConfig.bgClass,
              severityConfig.textClass
            )}>
              {typeConfig.label}
            </span>
          </div>
          
          <p className="font-semibold text-foreground truncate">
            {task.title}
          </p>
          
          <p className="text-sm text-muted-foreground mt-0.5">
            {task.subtitle}
          </p>
          
          {task.detail && (
            <p className="text-xs text-muted-foreground/70 mt-1">
              {task.detail}
            </p>
          )}
        </div>
        
        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-2 opacity-50 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

function SuccessState({ messages }: { messages: string[] }) {
  return (
    <div className="text-center py-10">
      <div className="relative inline-flex">
        <div className="absolute inset-0 bg-[hsl(142_76%_36%/0.2)] rounded-full blur-xl" />
        <div className="relative bg-[hsl(142_76%_36%/0.1)] p-4 rounded-full">
          <Sparkles className="w-8 h-8 text-[hsl(142_76%_36%)]" />
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mt-4">
        Vše v pořádku!
      </h3>
      
      <div className="mt-3 space-y-1">
        {messages.map((msg, i) => (
          <p key={i} className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[hsl(142_76%_36%)]" />
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
  
  const handleDismiss = (taskId: string) => {
    dismissTask(taskId);
    queryClient.invalidateQueries({ queryKey: ['dashboard-view-model'] });
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
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!data) return null;
  
  const { priorityTasks, totalTasksCount, allClear, successMessages } = data;

  return (
    <Card className="glass overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {allClear ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-[hsl(142_76%_36%)]" />
                Vše vyřešeno
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-[hsl(38_92%_50%)]" />
                Co teď?
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {totalTasksCount} {totalTasksCount === 1 ? 'úkol' : totalTasksCount < 5 ? 'úkoly' : 'úkolů'}
                </span>
              </>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent>
        {allClear ? (
          <SuccessState messages={successMessages} />
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {priorityTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onDismiss={() => handleDismiss(task.id)}
                  onClick={() => navigate(task.actionUrl)}
                />
              ))}
            </div>
            
            {totalTasksCount > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => navigate('/clients')}
              >
                Zobrazit všechny ({totalTasksCount})
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
