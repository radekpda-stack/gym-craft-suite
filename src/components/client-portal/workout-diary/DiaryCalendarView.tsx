import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  LayoutList,
  Dumbbell,
  User
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isToday,
  parseISO
} from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { UnifiedDiaryEntry } from '@/hooks/useUnifiedDiary';
import { getWorkoutTypeIcon, getWorkoutTypeColor } from './WorkoutTypeSelector';
import { motion, AnimatePresence } from 'framer-motion';

interface DiaryCalendarViewProps {
  entries: UnifiedDiaryEntry[];
  onDateSelect: (date: Date, entries: UnifiedDiaryEntry[]) => void;
}

type ViewMode = 'month' | 'week';

export function DiaryCalendarView({ entries, onDateSelect }: DiaryCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  // Group entries by date
  const entriesByDate = useMemo(() => {
    const map = new Map<string, UnifiedDiaryEntry[]>();
    entries.forEach(entry => {
      const dateKey = entry.date.split('T')[0];
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(entry);
    });
    return map;
  }, [entries]);

  // Calculate days to display
  const days = useMemo(() => {
    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    } else {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
  }, [currentDate, viewMode]);

  const navigatePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayEntries = entriesByDate.get(dateKey) || [];
    onDateSelect(date, dayEntries);
  };

  const weekDays = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

  return (
    <Card>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={navigatePrev}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-lg font-semibold min-w-[180px] text-center">
              {viewMode === 'month' 
                ? format(currentDate, 'LLLL yyyy', { locale: cs })
                : `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd.', { locale: cs })} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'd. MMMM yyyy', { locale: cs })}`
              }
            </h2>
            <Button variant="ghost" size="icon" onClick={navigateNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goToToday}>
              Dnes
            </Button>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <Button
                variant={viewMode === 'month' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none h-8"
                onClick={() => setViewMode('month')}
              >
                <CalendarIcon className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none h-8"
                onClick={() => setViewMode('week')}
              >
                <LayoutList className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={`${viewMode}-${currentDate.toISOString()}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "grid grid-cols-7 gap-1",
              viewMode === 'week' ? '' : ''
            )}
          >
            {days.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayEntries = entriesByDate.get(dateKey) || [];
              const hasCoached = dayEntries.some(e => e.is_coached);
              const hasSelfWorkout = dayEntries.some(e => !e.is_coached);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isSelected = isToday(day);

              return (
                <button
                  key={dateKey}
                  onClick={() => handleDateClick(day)}
                  className={cn(
                    "relative p-2 rounded-lg transition-all hover:bg-muted/50 min-h-[60px] flex flex-col items-center",
                    viewMode === 'week' && "min-h-[100px]",
                    !isCurrentMonth && viewMode === 'month' && "opacity-40",
                    isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                    dayEntries.length > 0 && "bg-muted/30"
                  )}
                >
                  <span className={cn(
                    "text-sm font-medium",
                    isToday(day) && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
                  )}>
                    {format(day, 'd')}
                  </span>
                  
                  {/* Entry indicators */}
                  {dayEntries.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 justify-center">
                      {hasCoached && (
                        <div className="w-2 h-2 rounded-full bg-primary" title="S trenérem" />
                      )}
                      {hasSelfWorkout && (
                        <div className="w-2 h-2 rounded-full bg-success" title="Samostatně" />
                      )}
                    </div>
                  )}

                  {/* Week view: show more details */}
                  {viewMode === 'week' && dayEntries.length > 0 && (
                    <div className="mt-2 space-y-1 w-full">
                      {dayEntries.slice(0, 2).map(entry => {
                        const Icon = getWorkoutTypeIcon(entry.workout_type);
                        return (
                          <div 
                            key={entry.id}
                            className={cn(
                              "text-xs px-1.5 py-0.5 rounded flex items-center gap-1 truncate",
                              entry.is_coached ? "bg-primary/20 text-primary" : "bg-success/20 text-success"
                            )}
                          >
                            {entry.is_coached ? (
                              <User className="w-3 h-3 shrink-0" />
                            ) : (
                              <Icon className="w-3 h-3 shrink-0" />
                            )}
                            <span className="truncate">
                              {entry.duration_minutes}min
                            </span>
                          </div>
                        );
                      })}
                      {dayEntries.length > 2 && (
                        <div className="text-xs text-muted-foreground text-center">
                          +{dayEntries.length - 2}
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span>S trenérem</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>Samostatně</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
