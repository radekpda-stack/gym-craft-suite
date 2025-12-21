import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  Wallet, 
  MessageSquare, 
  Clock, 
  CheckCircle2,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardViewModel, PriorityTask, dismissTask } from '@/hooks/useDashboardViewModel';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueryClient } from '@tanstack/react-query';

interface AttentionCardProps {
  data: DashboardViewModel | undefined;
  isLoading: boolean;
}

const TASK_ICONS = {
  overload: AlertTriangle,
  credit: Wallet,
  feedback: MessageSquare,
  unpaid: Clock,
} as const;

const TaskRow = memo(function TaskRow({ 
  task, 
  onNavigate 
}: { 
  task: PriorityTask;
  onNavigate: () => void;
}) {
  const Icon = TASK_ICONS[task.type];
  
  const getSeverityColor = () => {
    if (task.severity === 'error') return 'text-red-400';
    if (task.severity === 'warning') return 'text-amber-400';
    return 'text-muted-foreground';
  };
  
  return (
    <button
      onClick={onNavigate}
      className={cn(
        'w-full flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors',
        'hover:bg-secondary/50 active:bg-secondary/70',
        'group'
      )}
    >
      <Icon className={cn('w-4 h-4 shrink-0', getSeverityColor())} />
      
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium text-foreground truncate">
          {task.clientName}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {task.subtitle}
        </p>
      </div>
      
      <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors shrink-0" />
    </button>
  );
});

function AllClearState({ messages }: { messages: string[] }) {
  return (
    <div className="text-center py-6">
      <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 mb-3">
        <Sparkles className="w-6 h-6 text-emerald-400" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">Vše v pořádku!</p>
      {messages.length > 0 && (
        <p className="text-xs text-muted-foreground">{messages[0]}</p>
      )}
    </div>
  );
}

export function AttentionCard({ data, isLoading }: AttentionCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  if (isLoading) {
    return (
      <div className="liquid-glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-8" />
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }
  
  if (!data) return null;
  
  const { priorityTasks, allClear, successMessages, totalTasksCount } = data;
  const tasksToShow = priorityTasks.slice(0, 4);
  
  return (
    <div className="liquid-glass rounded-2xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {allClear ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          )}
          <span className="text-sm font-semibold text-foreground">
            {allClear ? 'Vše OK' : 'Vyžaduje pozornost'}
          </span>
        </div>
        {!allClear && totalTasksCount > 0 && (
          <span className="text-xs text-amber-400 font-medium">
            {totalTasksCount}
          </span>
        )}
      </div>
      
      {/* Content */}
      {allClear ? (
        <AllClearState messages={successMessages} />
      ) : (
        <div className="space-y-0.5">
          {tasksToShow.map(task => (
            <TaskRow 
              key={task.id} 
              task={task} 
              onNavigate={() => {
                if (task.clientId) {
                  navigate(`/clients/${task.clientId}`);
                }
              }}
            />
          ))}
          
          {totalTasksCount > 4 && (
            <button
              onClick={() => navigate('/clients')}
              className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              +{totalTasksCount - 4} další →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
