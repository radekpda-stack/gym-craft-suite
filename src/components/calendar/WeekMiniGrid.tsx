import { format, isSameDay, startOfWeek, addDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { TrainingSession } from '@/hooks/useTrainingSessions';

interface WeekMiniGridProps {
  currentDate: Date;
  sessions: TrainingSession[];
  onDaySelect: (date: Date) => void;
}

export function WeekMiniGrid({ currentDate, sessions, onDaySelect }: WeekMiniGridProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getEventsForDay = (date: Date) => {
    return sessions.filter((session) => isSameDay(new Date(session.date), date));
  };

  const getOccupancyColor = (count: number) => {
    if (count === 0) return 'bg-muted/30';
    if (count <= 2) return 'bg-success/20';
    if (count <= 5) return 'bg-success/40';
    if (count <= 8) return 'bg-warning/40';
    return 'bg-destructive/40';
  };

  return (
    <div className="glass-subtle rounded-xl p-3">
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day) => {
          const events = getEventsForDay(day);
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, currentDate);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDaySelect(day)}
              className={cn(
                'flex flex-col items-center p-2 rounded-lg transition-all touch-target',
                isSelected && 'ring-2 ring-primary',
                isToday && !isSelected && 'bg-primary/10'
              )}
            >
              <span className="text-[10px] text-muted-foreground uppercase">
                {format(day, 'EEE', { locale: cs })}
              </span>
              <span className={cn(
                'text-base font-bold mt-0.5',
                isToday ? 'text-primary' : 'text-foreground'
              )}>
                {format(day, 'd')}
              </span>
              {/* Occupancy indicator */}
              <div className={cn(
                'w-full h-1.5 rounded-full mt-1',
                getOccupancyColor(events.length)
              )} />
              {events.length > 0 && (
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {events.length}×
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
