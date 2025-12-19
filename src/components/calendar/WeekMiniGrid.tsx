import { format, isSameDay, startOfWeek, addDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { TrainingSession } from '@/hooks/useTrainingSessions';
import { SharedTraining } from '@/hooks/useSharedTrainings';

interface WeekMiniGridProps {
  currentDate: Date;
  sessions: TrainingSession[];
  sharedSessions?: SharedTraining[];
  onDaySelect: (date: Date) => void;
}

export function WeekMiniGrid({ currentDate, sessions, sharedSessions = [], onDaySelect }: WeekMiniGridProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getEventsForDay = (date: Date) => {
    const ownEvents = sessions.filter((session) => 
      isSameDay(new Date(session.date), date) && session.status !== 'canceled'
    );
    const sharedEvents = sharedSessions.filter((session) => 
      isSameDay(new Date(session.date), date)
    );
    return { own: ownEvents, shared: sharedEvents, total: ownEvents.length + sharedEvents.length };
  };

  // Heatmapa - intenzita barvy podle celkové obsazenosti
  const getHeatmapStyle = (totalCount: number) => {
    if (totalCount === 0) return { backgroundColor: 'hsl(var(--muted) / 0.2)' };
    
    // Clamp mezi 0.2 a 0.8 pro viditelnost
    const intensity = Math.min(0.8, 0.2 + (totalCount * 0.1));
    
    if (totalCount <= 3) {
      return { backgroundColor: `hsl(142 76% 36% / ${intensity})` }; // success/green
    } else if (totalCount <= 6) {
      return { backgroundColor: `hsl(48 96% 53% / ${intensity})` }; // warning/yellow
    } else {
      return { backgroundColor: `hsl(0 84% 60% / ${intensity})` }; // destructive/red
    }
  };

  return (
    <div className="glass-subtle rounded-xl p-3">
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day) => {
          const { own, shared, total } = getEventsForDay(day);
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, currentDate);
          const heatmapStyle = getHeatmapStyle(total);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDaySelect(day)}
              className={cn(
                'flex flex-col items-center p-2 rounded-lg transition-all touch-target relative overflow-hidden',
                isSelected && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
                isToday && !isSelected && 'ring-1 ring-primary/50'
              )}
              style={heatmapStyle}
            >
              <span className={cn(
                'text-[10px] uppercase font-medium',
                total > 4 ? 'text-white/90' : 'text-muted-foreground'
              )}>
                {format(day, 'EEE', { locale: cs })}
              </span>
              <span className={cn(
                'text-base font-bold mt-0.5',
                isToday ? 'text-primary' : total > 4 ? 'text-white' : 'text-foreground'
              )}>
                {format(day, 'd')}
              </span>
              
              {/* Počet tréninků */}
              {total > 0 && (
                <div className="flex items-center gap-0.5 mt-1">
                  <span className={cn(
                    'text-[10px] font-semibold',
                    total > 4 ? 'text-white/90' : 'text-foreground/70'
                  )}>
                    {own.length}
                  </span>
                  {shared.length > 0 && (
                    <span className={cn(
                      'text-[10px]',
                      total > 4 ? 'text-white/60' : 'text-muted-foreground'
                    )}>
                      +{shared.length}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Legenda */}
      <div className="flex items-center justify-center gap-4 mt-3 pt-2 border-t border-border/30">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-success/40" />
          <span className="text-[10px] text-muted-foreground">Volno</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-warning/60" />
          <span className="text-[10px] text-muted-foreground">Střední</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-destructive/70" />
          <span className="text-[10px] text-muted-foreground">Plno</span>
        </div>
      </div>
    </div>
  );
}
