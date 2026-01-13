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
  Users,
  Star,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardViewModel, PriorityTask, ClientQuickInfo } from '@/hooks/useDashboardViewModel';
import { Skeleton } from '@/components/ui/skeleton';

interface HeroAttentionCardProps {
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
    if (task.severity === 'error') return 'text-destructive';
    if (task.severity === 'warning') return 'text-warning';
    return 'text-muted-foreground';
  };
  
  return (
    <button
      onClick={onNavigate}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-2xl transition-all premium-touch',
        'bg-secondary/30 hover:bg-secondary/50',
        'group stagger-item'
      )}
    >
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
        task.severity === 'error' ? 'bg-destructive/10' : 
        task.severity === 'warning' ? 'bg-warning/10' : 'bg-muted/50'
      )}>
        <Icon className={cn('w-5 h-5', getSeverityColor())} />
      </div>
      
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

const ClientRow = memo(function ClientRow({ client }: { client: ClientQuickInfo }) {
  const navigate = useNavigate();
  
  const getStatusDot = () => {
    if (client.status === 'error') return 'bg-destructive';
    if (client.status === 'warning') return 'bg-warning';
    return 'bg-success';
  };
  
  return (
    <button
      onClick={() => navigate(`/clients/${client.id}`)}
      className={cn(
        'w-full flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors premium-touch stagger-item',
        'hover:bg-secondary/50 active:bg-secondary/70'
      )}
    >
      <div className={cn('w-2 h-2 rounded-full shrink-0', getStatusDot())} />
      <span className="text-sm font-medium text-foreground truncate flex-1 text-left">
        {client.name}
      </span>
      {client.isFavorite && (
        <Star className="w-3 h-3 text-warning fill-warning shrink-0" />
      )}
      <span className={cn(
        'text-xs tabular-nums shrink-0',
        client.creditBalance <= 0 ? 'text-destructive' : 
        client.creditBalance < 500 ? 'text-warning' : 
        'text-muted-foreground'
      )}>
        {client.creditBalance.toLocaleString('cs-CZ')} Kč
      </span>
    </button>
  );
});

function AllClearState({ messages }: { messages: string[] }) {
  return (
    <div className="text-center py-8">
      <div className="inline-flex p-4 rounded-3xl bg-success/10 mb-4">
        <Sparkles className="w-8 h-8 text-success" />
      </div>
      <p className="text-base font-semibold text-foreground mb-1">Vše v pořádku!</p>
      {messages.length > 0 && (
        <p className="text-sm text-muted-foreground">{messages[0]}</p>
      )}
    </div>
  );
}

export function HeroAttentionCard({ data, isLoading }: HeroAttentionCardProps) {
  const navigate = useNavigate();
  
  if (isLoading) {
    return (
      <div className="hero-card p-5 lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-10" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }
  
  if (!data) return null;
  
  const { priorityTasks, allClear, successMessages, totalTasksCount, clientsQuickInfo } = data;
  const tasksToShow = priorityTasks.slice(0, 4);
  
  // Sort clients by status (error first, then warning, then ok) and take top 5
  const sortedClients = [...clientsQuickInfo]
    .sort((a, b) => {
      const statusOrder = { error: 0, warning: 1, ok: 2 };
      return statusOrder[a.status] - statusOrder[b.status];
    })
    .slice(0, 5);
  
  const problemCount = clientsQuickInfo.filter(c => c.status !== 'ok').length;
  
  return (
    <div className="hero-card p-5 lg:col-span-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {allClear ? (
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {allClear ? 'Vše OK' : 'Vyžaduje pozornost'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {allClear ? 'Žádné urgentní úkoly' : `${totalTasksCount} položek k řešení`}
            </p>
          </div>
        </div>
        {!allClear && (
          <span className="text-2xl font-bold text-warning tabular-nums">
            {totalTasksCount}
          </span>
        )}
      </div>
      
      {/* Content */}
      {allClear ? (
        <AllClearState messages={successMessages} />
      ) : (
        <div className="space-y-2">
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
              className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
            >
              Zobrazit všech {totalTasksCount} položek
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
      
      {/* Client Quick Access - only if we have room and items */}
      {sortedClients.length > 0 && (
        <div className="mt-5 pt-5 border-t border-border/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Klienti</span>
            </div>
            {problemCount > 0 && (
              <span className="text-xs text-warning flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {problemCount}
              </span>
            )}
          </div>
          
          <div className="space-y-0.5">
            {sortedClients.map(client => (
              <ClientRow key={client.id} client={client} />
            ))}
            
            {clientsQuickInfo.length > 5 && (
              <button
                onClick={() => navigate('/clients')}
                className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Zobrazit všechny ({clientsQuickInfo.length}) →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
