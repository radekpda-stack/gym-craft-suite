import { cn } from '@/lib/utils';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Check } from 'lucide-react';

interface WeekStripProps {
  currentDate: Date;
  completedDays: Date[];
  onDaySelect: (date: Date) => void;
}

export function WeekStrip({ currentDate, completedDays, onDaySelect }: WeekStripProps) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const isDayCompleted = (date: Date) => 
    completedDays.some(d => isSameDay(d, date));

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {days.map((day) => {
        const isSelected = isSameDay(day, currentDate);
        const isCompleted = isDayCompleted(day);
        const isTodayDate = isToday(day);

        return (
          <button
            key={day.toISOString()}
            onClick={() => onDaySelect(day)}
            className={cn(
              "flex-1 min-w-[48px] flex flex-col items-center p-2 rounded-xl transition-all",
              isSelected 
                ? "bg-primary text-primary-foreground" 
                : isTodayDate
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "bg-muted/50 hover:bg-muted"
            )}
          >
            <span className="text-xs font-medium uppercase">
              {format(day, 'EEEEEE', { locale: cs })}
            </span>
            <span className={cn(
              "text-lg font-bold my-0.5",
              isSelected ? "text-primary-foreground" : ""
            )}>
              {format(day, 'd')}
            </span>
            {isCompleted && (
              <div className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center",
                isSelected ? "bg-primary-foreground/20" : "bg-success/20"
              )}>
                <Check className={cn(
                  "w-3 h-3",
                  isSelected ? "text-primary-foreground" : "text-success"
                )} />
              </div>
            )}
            {!isCompleted && <div className="w-4 h-4" />}
          </button>
        );
      })}
    </div>
  );
}
