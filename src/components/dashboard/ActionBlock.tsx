import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight,
  X,
  Wallet,
  MessageSquare,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Zap,
  Calendar,
  Play,
  Heart,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DashboardViewModel, dismissTask } from '@/hooks/useDashboardViewModel';
import { useQueryClient } from '@tanstack/react-query';
import { STATUS_CONFIG, Status } from '@/lib/statusUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientTask, TaskType, TaskSeverity } from '@/lib/clientTasksLogic';

interface ActionBlockProps {
  data: DashboardViewModel | undefined;
  isLoading: boolean;
}

// Mapování typů úkolů na ikony a popisky
const TASK_TYPE_CONFIG: Record<TaskType, { icon: typeof AlertTriangle; label: string }> = {
  'training-now': { icon: Play, label: 'Teď' },
  'training-today': { icon: Calendar, label: 'Dnes' },
  'overload': { icon: AlertTriangle, label: 'Přetížení' },
  'health-issue': { icon: Heart, label: 'Zdraví' },
  'feedback': { icon: MessageSquare, label: 'Feedback' },
  'credit': { icon: Wallet, label: 'Kredit' },
  'no-training': { icon: Clock, label: 'Neaktivní' },
  'unpaid': { icon: Wallet, label: 'Platba' },
  'note': { icon: MessageSquare, label: 'Poznámka' },
  'schedule': { icon: Calendar, label: 'Plán' },
};

const severityToStatus: Record<TaskSeverity, Status> = {
  error: 'error',
  warning: 'warning',
  info: 'ok',
};

// Kompatibilita s oběma typy (PriorityTask z useDashboardViewModel a ClientTask)
type DisplayTask = {
  id: string;
  type: TaskType | 'overload' | 'credit' | 'feedback' | 'unpaid';
  severity: TaskSeverity | Status;
  clientId: string;
  clientName: string;
  title: string;
  subtitle: string;
  detail?: string;
  actionLabel?: string;
  meta?: Record<string, any>;
};

interface ActionRowProps {
  task: DisplayTask;
  onDismiss: () => void;
  onClick: () => void;
}

const ActionRow = memo(function ActionRow({ task, onDismiss, onClick }: ActionRowProps) {
  const typeConfig = TASK_TYPE_CONFIG[task.type as TaskType] || { icon: AlertTriangle, label: task.type };
  const severity = task.severity === 'ok' ? 'info' : task.severity;
  const status = severityToStatus[severity as TaskSeverity] || 'warning';
  const config = STATUS_CONFIG[status];
  const Icon = typeConfig.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl transition-all group',
        'hover:bg-secondary/50 active:scale-[0.98]',
        'border-l-4',
        status === 'error' ? 'border-l-destructive' : 
        status === 'warning' ? 'border-l-warning' : 'border-l-primary'
      )}
    >
      {/* Icon */}
      <div className={cn('p-1.5 sm:p-2 rounded-lg shrink-0', config.bgClass)}>
        <Icon className={cn('w-4 h-4', config.textClass)} />
      </div>
      
      {/* Content - mobile optimized */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="font-medium text-foreground text-sm sm:text-base max-w-[120px] sm:max-w-none truncate">
            {task.clientName}
          </span>
          <span className={cn(
            'text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-1 sm:px-1.5 py-0.5 rounded whitespace-nowrap',
            config.bgClass,
            config.textClass
          )}>
            {typeConfig.label}
          </span>
        </div>
        <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
          {task.subtitle}
          {task.detail && ` • ${task.detail}`}
        </p>
      </div>
      
      {/* Action - simplified on mobile */}
      <span className={cn(
        'text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-1 rounded-lg shrink-0 whitespace-nowrap',
        'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground',
        'transition-colors'
      )}>
        {task.actionLabel || 'Otevřít'}
      </span>
      
      <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
    </button>
  );
});

function SuccessState({ messages }: { messages: string[] }) {
  return (
    <div className="flex items-center gap-4 p-4">
      <div className="p-3 rounded-xl bg-emerald-500/10">
        <Sparkles className="w-6 h-6 text-emerald-500" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-foreground">Vše v pořádku!</p>
        {messages.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {messages[0]}
          </p>
        )}
      </div>
      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
    </div>
  );
}

export function ActionBlock({ data, isLoading }: ActionBlockProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const handleDismiss = (taskId: string) => {
    dismissTask(taskId);
    queryClient.invalidateQueries({ queryKey: ['dashboard-view-model'] });
  };
  
  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="w-5 h-5 rounded" />
          <Skeleton className="h-5 w-32" />
        </div>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }
  
  if (!data) return null;
  
  const { priorityTasks, totalTasksCount, allClear, successMessages } = data;
  const displayTasks = priorityTasks.slice(0, 5);

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Zap className={cn(
            'w-5 h-5',
            allClear ? 'text-emerald-500' : 'text-warning'
          )} />
          <h2 className="font-semibold text-foreground">
            {allClear ? 'Vše vyřešeno' : 'Vyžadují pozornost'}
          </h2>
          {!allClear && totalTasksCount > 0 && (
            <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
              {totalTasksCount}
            </span>
          )}
        </div>
        
        {!allClear && displayTasks.length < totalTasksCount && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/clients')}
            className="text-xs"
          >
            Vše
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </div>
      
      {/* Content */}
      <div className="p-2">
        {allClear ? (
          <SuccessState messages={successMessages} />
        ) : (
          <div className="space-y-1">
            {displayTasks.map(task => (
              <ActionRow
                key={task.id}
                task={task}
                onDismiss={() => handleDismiss(task.id)}
                onClick={() => {
                  if (task.clientId) {
                    navigate(`/clients/${task.clientId}`);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
