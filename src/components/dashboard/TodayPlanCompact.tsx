import { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, CheckCircle2, XCircle, ChevronRight, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInMinutes, isBefore } from 'date-fns';
import { cs } from 'date-fns/locale';
import { DashboardViewModel, ScheduleItem } from '@/hooks/useDashboardViewModel';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface TodayPlanCompactProps {
  data: DashboardViewModel | undefined;
  isLoading: boolean;
}

interface TrainingChipProps {
  item: ScheduleItem;
  isNext: boolean;
  onClick: () => void;
}

const TrainingChip = memo(function TrainingChip({ item, isNext, onClick }: TrainingChipProps) {
  const getStatusStyles = () => {
    if (item.status === 'cancelled') return 'opacity-50 line-through';
    if (item.status === 'completed') return 'bg-emerald-500/10 border-emerald-500/30';
    if (isNext) return 'bg-primary/10 border-primary ring-2 ring-primary/20';
    return 'bg-secondary/50 border-border/50';
  };
  
  const getIcon = () => {
    if (item.status === 'cancelled') return <XCircle className="w-3.5 h-3.5 text-muted-foreground" />;
    if (item.status === 'completed') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    if (isNext) return <Play className="w-3.5 h-3.5 text-primary" />;
    return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-xl border transition-all',
        'hover:scale-[1.02] active:scale-[0.98]',
        getStatusStyles()
      )}
    >
      {getIcon()}
      <div className="text-left min-w-0">
        <p className={cn(
          'text-sm font-medium truncate max-w-[120px]',
          isNext ? 'text-primary' : 'text-foreground'
        )}>
          {item.clientName}
        </p>
        <p className={cn(
          'text-xs tabular-nums',
          isNext ? 'text-primary/70' : 'text-muted-foreground'
        )}>
          {item.time}
        </p>
      </div>
    </button>
  );
});

function NextTrainingHighlight({ item, onClick }: { item: ScheduleItem; onClick: () => void }) {
  const now = new Date();
  const trainingTime = new Date(item.date);
  const minutesUntil = differenceInMinutes(trainingTime, now);
  
  const getTimeLabel = () => {
    if (minutesUntil < 0) return 'Právě teď';
    if (minutesUntil < 60) return `Za ${minutesUntil} min`;
    const hours = Math.floor(minutesUntil / 60);
    return `Za ${hours}h ${minutesUntil % 60}min`;
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-4 rounded-xl',
        'bg-gradient-to-r from-primary/10 to-primary/5',
        'border border-primary/20',
        'hover:from-primary/15 hover:to-primary/10 transition-all',
        'group min-w-0'
      )}
    >
      <div className="p-3 rounded-xl bg-primary/20 shrink-0">
        <Play className="w-5 h-5 text-primary" />
      </div>
      
      <div className="flex-1 min-w-0 text-left">
        <p className="text-xs text-primary/70 font-medium uppercase tracking-wider">
          Příští trénink
        </p>
        <p className="text-base font-semibold text-foreground truncate">
          {item.clientName}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {item.time} • {getTimeLabel()}
        </p>
      </div>
      
      <Button size="sm" className="shrink-0 group-hover:bg-primary/90 whitespace-nowrap">
        Otevřít
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </button>
  );
}

export function TodayPlanCompact({ data, isLoading }: TodayPlanCompactProps) {
  const navigate = useNavigate();
  
  const { nextTraining, otherTrainings, completedCount, totalCount } = useMemo(() => {
    if (!data) return { nextTraining: null, otherTrainings: [], completedCount: 0, totalCount: 0 };
    
    const schedule = data.todaySchedule;
    const now = new Date();
    
    // Find next scheduled training
    const nextIdx = schedule.findIndex(t => 
      t.status === 'scheduled' && !isBefore(new Date(t.date), now)
    );
    
    const next = nextIdx >= 0 ? schedule[nextIdx] : null;
    const others = schedule.filter((_, idx) => idx !== nextIdx).slice(0, 5);
    
    return {
      nextTraining: next,
      otherTrainings: others,
      completedCount: schedule.filter(t => t.status === 'completed').length,
      totalCount: schedule.length,
    };
  }, [data]);
  
  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-24 rounded-xl" />
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-32 rounded-xl shrink-0" />
          ))}
        </div>
      </div>
    );
  }
  
  if (!data) return null;

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Dnešní plán</h2>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), 'EEEE, d. MMMM', { locale: cs })}
            </p>
          </div>
        </div>
        
        {totalCount > 0 && (
          <div className="text-right">
            <span className="text-2xl font-bold text-foreground tabular-nums">
              {completedCount}/{totalCount}
            </span>
            <p className="text-xs text-muted-foreground">hotovo</p>
          </div>
        )}
      </div>
      
      <div className="p-4 space-y-4">
        {/* Next training highlight */}
        {nextTraining ? (
          <NextTrainingHighlight
            item={nextTraining}
            onClick={() => navigate(`/trainings/${nextTraining.id}`)}
          />
        ) : totalCount === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex p-4 rounded-2xl bg-muted/30 mb-3">
              <Calendar className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Žádné tréninky</p>
            <p className="text-xs text-muted-foreground/70">Volný den</p>
          </div>
        ) : (
          <div className="text-center py-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">Vše dokončeno!</p>
          </div>
        )}
        
        {/* Other trainings as horizontal scroll */}
        {otherTrainings.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium px-1">
              {nextTraining ? 'Další tréninky' : 'Dnešní tréninky'}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {otherTrainings.map(item => (
                <TrainingChip
                  key={item.id}
                  item={item}
                  isNext={false}
                  onClick={() => navigate(`/trainings/${item.id}`)}
                />
              ))}
              
              {data.todaySchedule.length > 6 && (
                <button
                  onClick={() => navigate('/calendar')}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-secondary/30 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  +{data.todaySchedule.length - 6}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Quick calendar access */}
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => navigate('/calendar')}
        >
          <Calendar className="w-4 h-4" />
          Celý kalendář
        </Button>
      </div>
    </div>
  );
}
