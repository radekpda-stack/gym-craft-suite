import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Dumbbell, Zap, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMyTrainingCalendar, CalendarDay } from '@/hooks/useTrainingCalendar';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfWeek, 
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
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all",
        compact ? "p-0.5" : "p-1",
        !isCurrentMonth && "opacity-30",
        today && "ring-2 ring-primary ring-offset-1 ring-offset-background",
        day.hasWorkout && intensity === 1 && "bg-success/20",
        day.hasWorkout && intensity === 2 && "bg-success/40",
        day.hasWorkout && intensity === 3 && "bg-success/60",
        day.hasWorkout && intensity >= 4 && "bg-success/80",
      )}
    >
      <span className={cn(
        "text-xs font-medium",
        day.hasWorkout && intensity >= 3 && "text-success-foreground",
        !isCurrentMonth && "text-muted-foreground"
      )}>
        {format(day.date, 'd')}
      </span>
      
      {day.hasWorkout && !compact && (
        <div className="flex items-center gap-0.5 mt-0.5">
          {day.workoutCount > 1 ? (
            <span className={cn(
              "text-[9px] font-bold",
              intensity >= 3 ? "text-success-foreground" : "text-success"
            )}>
              ×{day.workoutCount}
            </span>
          ) : (
            <Dumbbell className={cn(
              "w-2.5 h-2.5",
              intensity >= 3 ? "text-success-foreground" : "text-success"
            )} />
          )}
        </div>
      )}
      
      {day.hasWorkout && compact && (
        <div className={cn(
          "absolute bottom-0.5 w-1 h-1 rounded-full",
          intensity >= 3 ? "bg-success-foreground" : "bg-success"
        )} />
      )}
    </motion.div>
  );
}

export function TrainingCalendar({ className, compact = false }: TrainingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { days, isLoading, totalWorkouts, totalXp } = useMyTrainingCalendar(currentMonth);
  
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
        <CardContent className="p-4">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            Tréninkový kalendář
          </CardTitle>
          
          {/* Stats badges */}
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="gap-1 text-xs">
              <Dumbbell className="w-3 h-3" />
              {totalWorkouts}
            </Badge>
            {totalXp > 0 && (
              <Badge variant="secondary" className="gap-1 text-xs bg-warning/10 text-warning">
                <Zap className="w-3 h-3" />
                {totalXp}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Month navigation */}
        <div className="flex items-center justify-between mt-2">
          <Button variant="ghost" size="icon" onClick={goToPrevMonth} className="h-7 w-7">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={goToToday}
            className="text-sm font-medium h-7 px-2"
          >
            {format(currentMonth, 'LLLL yyyy', { locale: cs })}
          </Button>
          
          <Button variant="ghost" size="icon" onClick={goToNextMonth} className="h-7 w-7">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map(day => (
            <div key={day} className="text-center text-[10px] font-medium text-muted-foreground py-1">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Padding cells */}
          {Array.from({ length: paddingDays }).map((_, i) => (
            <div key={`pad-${i}`} className="aspect-square" />
          ))}
          
          {/* Day cells */}
          <AnimatePresence mode="popLayout">
            {days.map((day, i) => (
              <DayCell 
                key={day.dateStr} 
                day={day} 
                currentMonth={currentMonth}
                compact={compact}
              />
            ))}
          </AnimatePresence>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-3 mt-3 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-success/20" />
            <span>1×</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-success/40" />
            <span>2×</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-success/60" />
            <span>3×</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-success/80" />
            <span>4+</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
