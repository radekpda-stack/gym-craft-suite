import { memo, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, CheckCircle2, XCircle, ChevronRight, Play, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInMinutes, isBefore, startOfWeek, addDays, isSameDay } from 'date-fns';
import { cs } from 'date-fns/locale';
import { DashboardViewModel, ScheduleItem } from '@/hooks/useDashboardViewModel';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CreateTrainingDialog } from '@/components/trainings/CreateTrainingDialog';

interface TrainingsCalendarCardProps {
  data: DashboardViewModel | undefined;
  isLoading: boolean;
}

type ViewMode = 'today' | 'week';

interface TrainingItemProps {
  item: ScheduleItem;
  isNext: boolean;
  onClick: () => void;
}

const TrainingItem = memo(function TrainingItem({ item, isNext, onClick }: TrainingItemProps) {
  const getStatusStyles = () => {
    if (item.status === 'cancelled') return 'opacity-50';
    if (item.status === 'completed') return 'bg-emerald-500/10';
    if (isNext) return 'bg-primary/10';
    return 'bg-secondary/30';
  };
  
  const getStatusIcon = () => {
    if (item.status === 'cancelled') return <XCircle className="w-4 h-4 text-muted-foreground" />;
    if (item.status === 'completed') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    return <Clock className="w-4 h-4 text-muted-foreground" />;
  };

  const getStatusLabel = () => {
    if (item.status === 'cancelled') return 'zrušeno';
    if (item.status === 'completed') return 'hotovo';
    return 'plánováno';
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all',
        'hover:bg-secondary/50 active:scale-[0.99]',
        getStatusStyles(),
        item.status === 'cancelled' && 'line-through'
      )}
    >
      {getStatusIcon()}
      <span className={cn(
        'flex-1 text-left text-sm font-medium truncate',
        item.status === 'cancelled' && 'text-muted-foreground'
      )}>
        {item.clientName}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">
        {item.time}
      </span>
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {getStatusLabel()}
      </span>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
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
    const mins = minutesUntil % 60;
    return mins > 0 ? `Za ${hours}h ${mins}min` : `Za ${hours}h`;
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl',
        'bg-gradient-to-r from-primary/15 to-primary/5',
        'border border-primary/20',
        'hover:from-primary/20 hover:to-primary/10 transition-all',
        'group'
      )}
    >
      <div className="p-2.5 rounded-xl bg-primary/20 shrink-0">
        <Play className="w-5 h-5 text-primary" />
      </div>
      
      <div className="flex-1 min-w-0 text-left">
        <p className="text-xs text-primary/70 font-medium uppercase tracking-wider">
          Příští trénink
        </p>
        <p className="text-base font-semibold text-foreground truncate">
          {item.clientName}
        </p>
        <p className="text-sm text-muted-foreground">
          {item.time} • {getTimeLabel()}
        </p>
      </div>
      
      <ChevronRight className="w-5 h-5 text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </button>
  );
}

function WeekMiniOverview({ weekSchedule }: { weekSchedule: ScheduleItem[] }) {
  const navigate = useNavigate();
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const dayTrainings = weekSchedule.filter(s => {
        const trainingDate = new Date(s.date);
        return isSameDay(trainingDate, date);
      });
      const completed = dayTrainings.filter(t => t.status === 'completed').length;
      const total = dayTrainings.filter(t => t.status !== 'cancelled').length;
      
      return {
        date,
        dayName: format(date, 'EEEEE', { locale: cs }).toUpperCase(),
        dayNumber: format(date, 'd'),
        isToday: isSameDay(date, today),
        total,
        completed,
      };
    });
  }, [weekSchedule, weekStart, today]);

  return (
    <div className="grid grid-cols-7 gap-1">
      {weekDays.map((day, idx) => (
        <button
          key={idx}
          onClick={() => navigate('/calendar')}
          className={cn(
            'flex flex-col items-center py-2 rounded-lg transition-colors',
            'hover:bg-secondary/50',
            day.isToday && 'bg-primary/10 ring-1 ring-primary/30'
          )}
        >
          <span className="text-[10px] text-muted-foreground font-medium">
            {day.dayName}
          </span>
          <span className={cn(
            'text-sm font-semibold',
            day.isToday ? 'text-primary' : 'text-foreground'
          )}>
            {day.dayNumber}
          </span>
          {day.total > 0 ? (
            <span className={cn(
              'text-[10px] font-medium tabular-nums',
              day.completed === day.total ? 'text-emerald-500' : 'text-muted-foreground'
            )}>
              {day.completed}/{day.total}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground/50">-</span>
          )}
        </button>
      ))}
    </div>
  );
}

export const TrainingsCalendarCard = memo(function TrainingsCalendarCard({ 
  data, 
  isLoading 
}: TrainingsCalendarCardProps) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  const { 
    nextTraining, 
    displayTrainings, 
    completedCount, 
    totalCount 
  } = useMemo(() => {
    if (!data) return { nextTraining: null, displayTrainings: [], completedCount: 0, totalCount: 0 };
    
    const schedule = viewMode === 'today' ? data.todaySchedule : data.weekSchedule;
    const now = new Date();
    
    // Find next scheduled training
    const nextIdx = schedule.findIndex(t => 
      t.status === 'scheduled' && !isBefore(new Date(t.date), now)
    );
    
    const next = nextIdx >= 0 ? schedule[nextIdx] : null;
    const others = schedule
      .filter((_, idx) => idx !== nextIdx)
      .slice(0, viewMode === 'today' ? 5 : 8);
    
    const activeTrainings = schedule.filter(t => t.status !== 'cancelled');
    
    return {
      nextTraining: next,
      displayTrainings: others,
      completedCount: activeTrainings.filter(t => t.status === 'completed').length,
      totalCount: activeTrainings.length,
    };
  }, [data, viewMode]);
  
  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
        <Skeleton className="h-20 rounded-xl" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }
  
  if (!data) return null;

  return (
    <>
      <div className="glass rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Tréninky</h2>
              <p className="text-xs text-muted-foreground">
                {format(new Date(), 'EEEE, d. MMMM', { locale: cs })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex bg-secondary/50 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('today')}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                  viewMode === 'today' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Dnes
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                  viewMode === 'week' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Týden
              </button>
            </div>
            
            {/* Add button */}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Stats bar */}
        {totalCount > 0 && (
          <div className="px-4 py-2 bg-secondary/30 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {viewMode === 'today' ? 'Dnešní tréninky' : 'Tento týden'}
            </span>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-sm font-semibold tabular-nums">
                {completedCount}/{totalCount}
              </span>
            </div>
          </div>
        )}
        
        <div className="p-4 space-y-4">
          {/* Next training highlight */}
          {nextTraining ? (
            <NextTrainingHighlight
              item={nextTraining}
              onClick={() => navigate(`/trainings/${nextTraining.id}`)}
            />
          ) : totalCount === 0 ? (
            <div className="text-center py-6">
              <div className="inline-flex p-3 rounded-2xl bg-muted/30 mb-2">
                <Calendar className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {viewMode === 'today' ? 'Žádné tréninky dnes' : 'Žádné tréninky tento týden'}
              </p>
              <Button
                variant="link"
                size="sm"
                className="mt-1"
                onClick={() => setShowCreateDialog(true)}
              >
                Naplánovat trénink
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Vše dokončeno!</p>
            </div>
          )}
          
          {/* Training list */}
          {displayTrainings.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium px-1 mb-2">
                {nextTraining ? 'Další tréninky' : 'Tréninky'}
              </p>
              {displayTrainings.map(item => (
                <TrainingItem
                  key={item.id}
                  item={item}
                  isNext={false}
                  onClick={() => navigate(`/trainings/${item.id}`)}
                />
              ))}
            </div>
          )}
          
          {/* Week mini overview */}
          {viewMode === 'today' && data.weekSchedule.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground font-medium mb-2">
                Přehled týdne
              </p>
              <WeekMiniOverview weekSchedule={data.weekSchedule} />
            </div>
          )}
          
          {/* Calendar link */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => navigate('/calendar')}
          >
            <Calendar className="w-4 h-4" />
            Otevřít kalendář
          </Button>
        </div>
      </div>
      
      {/* Create Training Dialog */}
      <CreateTrainingDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </>
  );
});
