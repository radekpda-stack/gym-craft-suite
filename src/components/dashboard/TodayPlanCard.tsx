import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { DashboardViewModel, ScheduleItem } from '@/hooks/useDashboardViewModel';
import { Skeleton } from '@/components/ui/skeleton';

interface TodayPlanCardProps {
  data: DashboardViewModel | undefined;
  isLoading: boolean;
}

const TrainingRow = memo(function TrainingRow({ item }: { item: ScheduleItem }) {
  const navigate = useNavigate();
  
  const getStatusIcon = () => {
    if (item.status === 'cancelled') return <XCircle className="w-3.5 h-3.5 text-muted-foreground/50" />;
    if (item.status === 'completed') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
    return <Clock className="w-3.5 h-3.5 text-blue-400" />;
  };
  
  return (
    <button
      onClick={() => navigate(`/trainings/${item.id}`)}
      className={cn(
        'w-full flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors',
        'hover:bg-secondary/50 active:bg-secondary/70',
        item.status === 'cancelled' && 'opacity-50'
      )}
    >
      {getStatusIcon()}
      <span className="text-sm font-medium text-foreground truncate flex-1 text-left">
        {item.clientName}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">
        {item.time}
      </span>
    </button>
  );
});

export function TodayPlanCard({ data, isLoading }: TodayPlanCardProps) {
  const navigate = useNavigate();
  
  if (isLoading) {
    return (
      <div className="liquid-glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-1">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-10 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }
  
  if (!data) return null;
  
  const trainings = data.todaySchedule.slice(0, 5);
  const hasMore = data.todaySchedule.length > 5;
  
  return (
    <div className="liquid-glass rounded-2xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Dnešní plán</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {format(new Date(), 'd. MMM', { locale: cs })}
        </span>
      </div>
      
      {/* Training list */}
      {trainings.length > 0 ? (
        <div className="space-y-0.5">
          {trainings.map(item => (
            <TrainingRow key={item.id} item={item} />
          ))}
          
          {hasMore && (
            <button
              onClick={() => navigate('/calendar')}
              className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              +{data.todaySchedule.length - 5} další →
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <Calendar className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Žádné tréninky</p>
        </div>
      )}
    </div>
  );
}
