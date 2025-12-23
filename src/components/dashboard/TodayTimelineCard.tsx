import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { DashboardViewModel, ScheduleItem } from '@/hooks/useDashboardViewModel';
import { Skeleton } from '@/components/ui/skeleton';

interface TodayTimelineCardProps {
  data: DashboardViewModel | undefined;
  isLoading: boolean;
}

const TimelineRow = memo(function TimelineRow({ item, isNext }: { item: ScheduleItem; isNext: boolean }) {
  const navigate = useNavigate();
  
  const getDotClass = () => {
    if (item.status === 'cancelled') return 'timeline-dot-cancelled';
    if (item.status === 'completed') return 'timeline-dot-completed';
    if (isNext) return 'timeline-dot-active';
    return '';
  };
  
  const getStatusIcon = () => {
    if (item.status === 'cancelled') return <XCircle className="w-3 h-3 text-muted-foreground/50" />;
    if (item.status === 'completed') return <CheckCircle2 className="w-3 h-3 text-white" />;
    if (isNext) return <Clock className="w-3 h-3 text-primary-foreground" />;
    return null;
  };
  
  return (
    <button
      onClick={() => navigate(`/trainings/${item.id}`)}
      className={cn(
        'timeline-row w-full group stagger-item',
        item.status === 'cancelled' && 'opacity-50'
      )}
    >
      <div className={cn('timeline-dot', getDotClass())}>
        {getStatusIcon()}
      </div>
      
      <div className="flex-1 min-w-0 text-left">
        <p className={cn(
          'text-sm font-medium truncate',
          isNext ? 'text-primary' : 'text-foreground'
        )}>
          {item.clientName}
        </p>
        {isNext && (
          <p className="text-xs text-primary/70">Příští trénink</p>
        )}
      </div>
      
      <span className={cn(
        'text-sm font-medium tabular-nums',
        isNext ? 'text-primary' : 'text-muted-foreground'
      )}>
        {item.time}
      </span>
      
      <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
    </button>
  );
});

export function TodayTimelineCard({ data, isLoading }: TodayTimelineCardProps) {
  const navigate = useNavigate();
  
  if (isLoading) {
    return (
      <div className="hero-card p-5">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }
  
  if (!data) return null;
  
  const trainings = data.todaySchedule.slice(0, 6);
  const hasMore = data.todaySchedule.length > 6;
  
  // Find the first non-completed, non-cancelled training (next)
  const nextIndex = trainings.findIndex(t => t.status === 'scheduled');
  
  return (
    <div className="hero-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Dnešní plán</h2>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), 'd. MMMM', { locale: cs })}
            </p>
          </div>
        </div>
        <span className="text-2xl font-bold text-foreground tabular-nums">
          {data.todaySchedule.length}
        </span>
      </div>
      
      {/* Timeline */}
      {trainings.length > 0 ? (
        <div className="timeline-apple space-y-1">
          {trainings.map((item, index) => (
            <TimelineRow 
              key={item.id} 
              item={item} 
              isNext={index === nextIndex}
            />
          ))}
          
          {hasMore && (
            <button
              onClick={() => navigate('/calendar')}
              className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
            >
              +{data.todaySchedule.length - 6} další
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-10">
          <div className="inline-flex p-4 rounded-3xl bg-muted/30 mb-4">
            <Calendar className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Žádné tréninky</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Volný den</p>
        </div>
      )}
    </div>
  );
}
