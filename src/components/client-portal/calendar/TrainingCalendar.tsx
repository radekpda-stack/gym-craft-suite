import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Dumbbell, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMyTrainingCalendar, CalendarDay } from '@/hooks/useTrainingCalendar';
import { 
  format, 
  addMonths, 
  subMonths, 
  isToday, 
  isSameMonth,
  getDay
} from 'date-fns';
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
        "aspect-square rounded-md flex items-center justify-center relative transition-all text-[11px]",
        !isCurrentMonth && "opacity-30",
        today && "ring-1.5 ring-primary ring-offset-1 ring-offset-background",
        day.hasWorkout && intensity === 1 && "bg-success/20",
        day.hasWorkout && intensity === 2 && "bg-success/40",
        day.hasWorkout && intensity === 3 && "bg-success/60",
        day.hasWorkout && intensity >= 4 && "bg-success/80",
      )}
    >
      <span className={cn(
        "font-medium",
        day.hasWorkout && intensity >= 3 && "text-success-foreground",
        !isCurrentMonth && "text-muted-foreground"
      )}>
        {format(day.date, 'd')}
      </span>
      
      {day.hasWorkout && (
        <div className={cn(
          "absolute bottom-0.5 w-1 h-1 rounded-full",
          intensity >= 3 ? "bg-success-foreground" : "bg-success"
        )} />
      )}
    </div>
  );
}

export function TrainingCalendar({ className, compact = false }: TrainingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { days, isLoading, totalWorkouts } = useMyTrainingCalendar(currentMonth);
  
  const goToPrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const goToToday = () => setCurrentMonth(new Date());
  
  // Calculate padding days for week alignment (Monday start)
  const firstDayOfMonth = days[0]?.date;
  const paddingDays = firstDayOfMonth 
    ? (getDay(firstDayOfMonth) + 6) % 7 // Convert Sunday=0 to Monday=0
    : 0;
  
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-3">
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-primary" />
            Kalendář
          </CardTitle>
          
          <Badge variant="secondary" className="gap-1 text-[10px] h-5 px-1.5">
            <Dumbbell className="w-2.5 h-2.5" />
            {totalWorkouts}
          </Badge>
        </div>
        
        {/* Month navigation - compact */}
        <div className="flex items-center justify-between mt-1">
          <Button variant="ghost" size="icon" onClick={goToPrevMonth} className="h-6 w-6">
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={goToToday}
            className="text-xs font-medium h-6 px-2"
          >
            {format(currentMonth, 'LLL yyyy', { locale: cs })}
          </Button>
          
          <Button variant="ghost" size="icon" onClick={goToNextMonth} className="h-6 w-6">
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-3 pt-0">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-0.5 mb-0.5">
          {WEEKDAYS.map(day => (
            <div key={day} className="text-center text-[9px] font-medium text-muted-foreground py-0.5">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
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
        
        {/* Compact legend */}
        <div className="flex items-center justify-center gap-2 mt-2 text-[9px] text-muted-foreground">
          <div className="flex items-center gap-0.5">
            <div className="w-2 h-2 rounded-sm bg-success/30" />
            <span>1×</span>
          </div>
          <div className="flex items-center gap-0.5">
            <div className="w-2 h-2 rounded-sm bg-success/60" />
            <span>2+</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
