import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format, subDays, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';

interface AttendanceHeatmapProps {
  sessions: Array<{ id: string; date: string }>;
  isLoading?: boolean;
}

export function AttendanceHeatmap({ sessions, isLoading }: AttendanceHeatmapProps) {
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    const totalWeeks = 16; // ~4 months
    const startDate = startOfWeek(subDays(today, totalWeeks * 7), { weekStartsOn: 1 });
    
    // Create session date set for O(1) lookup
    const sessionDates = new Set(sessions.map(s => s.date));

    const weeks: Array<Array<{ date: Date; count: number; isToday: boolean }>> = [];
    const monthLabels: Array<{ label: string; weekIndex: number }> = [];
    let lastMonth = -1;

    for (let w = 0; w < totalWeeks; w++) {
      const week: Array<{ date: Date; count: number; isToday: boolean }> = [];
      for (let d = 0; d < 7; d++) {
        const date = addDays(startDate, w * 7 + d);
        const dateStr = format(date, 'yyyy-MM-dd');
        const count = sessionDates.has(dateStr) ? 1 : 0;
        week.push({ date, count, isToday: isSameDay(date, today) });

        if (d === 0 && date.getMonth() !== lastMonth) {
          lastMonth = date.getMonth();
          monthLabels.push({
            label: format(date, 'LLL', { locale: cs }),
            weekIndex: w,
          });
        }
      }
      weeks.push(week);
    }

    return { weeks, monthLabels };
  }, [sessions]);

  if (isLoading) return null;
  if (sessions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="w-4 h-4" />
          Aktivita
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <TooltipProvider delayDuration={100}>
          {/* Month labels */}
          <div className="flex mb-1 ml-0">
            {monthLabels.map((m, i) => (
              <span
                key={i}
                className="text-[10px] text-muted-foreground capitalize"
                style={{ position: 'relative', left: `${m.weekIndex * 14}px` }}
              >
                {m.label}
              </span>
            ))}
          </div>
          
          {/* Heatmap grid */}
          <div className="flex gap-[2px] overflow-x-auto">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[2px]">
                {week.map((day, di) => (
                  <Tooltip key={di}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "w-3 h-3 rounded-[2px] transition-colors",
                          day.count > 0
                            ? "bg-primary"
                            : "bg-muted/60",
                          day.isToday && "ring-1 ring-foreground/30"
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p>{format(day.date, 'EEEE d. MMMM', { locale: cs })}</p>
                      <p className="font-medium">
                        {day.count > 0 ? 'Trénink ✓' : 'Bez tréninku'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
