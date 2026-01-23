import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dumbbell, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMyTrainingCalendar, CalendarDay } from '@/hooks/useTrainingCalendar';
import { format, isToday, isSameMonth, getDay } from 'date-fns';
import { cs } from 'date-fns/locale';

interface TrainingCalendarProps {
  className?: string;
  compact?: boolean;
}

const WEEKDAYS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

function DayCell({
  day, 
  currentMonth, 
  compact 
}: { 
  day: CalendarDay; 
  currentMonth: Date;
  compact?: boolean;
}) {
  const isCurrentMonth = isSameMonth(day.date, currentMonth);
  const today = isToday(day.date);
  
  // Intensity based on workout count (1-4 levels)
  const intensity = Math.min(day.workoutCount, 4);
  
  return (
    <div
      className={cn(
        "aspect-square rounded flex items-center justify-center relative text-[10px]",
        !isCurrentMonth && "opacity-30",
        today && "ring-1 ring-primary ring-offset-1 ring-offset-background",
        day.hasWorkout && intensity === 1 && "bg-success/20",
        day.hasWorkout && intensity === 2 && "bg-success/40",
        day.hasWorkout && intensity >= 3 && "bg-success/60",
      )}
    >
      <span className={cn(
        "font-medium",
        day.hasWorkout && intensity >= 3 && "text-success-foreground",
        !isCurrentMonth && "text-muted-foreground"
      )}>
        {format(day.date, 'd')}
      </span>
    </div>
  );
}

export function TrainingCalendar({ className, compact = false }: TrainingCalendarProps) {
  // Fixed to current month - no navigation needed for dashboard overview
  const currentMonth = new Date();
  const { days, isLoading, totalWorkouts } = useMyTrainingCalendar(currentMonth);
  
  // Calculate padding days for week alignment (Monday start)
  const firstDayOfMonth = days[0]?.date;
  const paddingDays = firstDayOfMonth 
    ? (getDay(firstDayOfMonth) + 6) % 7 // Convert Sunday=0 to Monday=0
    : 0;
  
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-2">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <CardHeader className="p-2 pb-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs flex items-center gap-1">
            <CalendarDays className="w-3 h-3 text-primary" />
            {format(currentMonth, 'LLLL', { locale: cs })}
          </CardTitle>
          
          <Badge variant="secondary" className="gap-0.5 text-[9px] h-4 px-1">
            <Dumbbell className="w-2 h-2" />
            {totalWorkouts}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-2 pt-0">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-px mb-px">
          {WEEKDAYS.map(day => (
            <div key={day} className="text-center text-[8px] font-medium text-muted-foreground py-0.5">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid - compact */}
        <div className="grid grid-cols-7 gap-px">
          {/* Padding cells */}
          {Array.from({ length: paddingDays }).map((_, i) => (
            <div key={`pad-${i}`} className="aspect-square" />
          ))}
          
          {/* Day cells */}
          {days.map((day) => (
            <DayCell 
              key={day.dateStr} 
              day={day} 
              currentMonth={currentMonth}
              compact={compact}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
