import { Card, CardContent } from '@/components/ui/card';
import { useMemo } from 'react';
import { format, parseISO, differenceInDays, startOfWeek, addDays, isSameDay } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Flame, Calendar, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimpleStatsCardProps {
  workoutDates: string[];
}

export function SimpleStatsCard({ workoutDates }: SimpleStatsCardProps) {
  const stats = useMemo(() => {
    const today = new Date();
    const sortedDates = [...workoutDates]
      .map(d => parseISO(d))
      .sort((a, b) => b.getTime() - a.getTime());

    // Calculate streak
    let streak = 0;
    if (sortedDates.length > 0) {
      const todayStr = format(today, 'yyyy-MM-dd');
      const yesterdayStr = format(addDays(today, -1), 'yyyy-MM-dd');
      
      // Check if there's a workout today or yesterday
      if (workoutDates.includes(todayStr) || workoutDates.includes(yesterdayStr)) {
        let checkDate = workoutDates.includes(todayStr) ? today : addDays(today, -1);
        
        while (true) {
          const dateStr = format(checkDate, 'yyyy-MM-dd');
          if (workoutDates.includes(dateStr)) {
            streak++;
            checkDate = addDays(checkDate, -1);
          } else {
            break;
          }
        }
      }
    }

    // This month count
    const thisMonth = format(today, 'yyyy-MM');
    const thisMonthCount = workoutDates.filter(d => d.startsWith(thisMonth)).length;

    return { streak, thisMonthCount };
  }, [workoutDates]);

  // Last 5 weeks activity grid
  const activityGrid = useMemo(() => {
    const today = new Date();
    const weeks: boolean[][] = [];
    
    for (let w = 4; w >= 0; w--) {
      const weekStart = startOfWeek(addDays(today, -w * 7), { weekStartsOn: 1 });
      const weekDays: boolean[] = [];
      
      for (let d = 0; d < 7; d++) {
        const day = addDays(weekStart, d);
        const dayStr = format(day, 'yyyy-MM-dd');
        weekDays.push(workoutDates.includes(dayStr));
      }
      
      weeks.push(weekDays);
    }
    
    return weeks;
  }, [workoutDates]);

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between gap-4">
          {/* Stats */}
          <div className="flex gap-6">
            {/* Streak */}
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                stats.streak > 0 ? "bg-orange-500/10 text-orange-500" : "bg-muted text-muted-foreground"
              )}>
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.streak}</div>
                <div className="text-xs text-muted-foreground">dní v řadě</div>
              </div>
            </div>

            {/* This month */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.thisMonthCount}</div>
                <div className="text-xs text-muted-foreground">tento měsíc</div>
              </div>
            </div>
          </div>

          {/* Activity grid */}
          <div className="hidden sm:flex flex-col gap-0.5">
            <div className="flex gap-0.5 mb-1">
              {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map((day) => (
                <div key={day} className="w-4 h-3 text-[9px] text-muted-foreground text-center">
                  {day}
                </div>
              ))}
            </div>
            {activityGrid.map((week, weekIdx) => (
              <div key={weekIdx} className="flex gap-0.5">
                {week.map((hasWorkout, dayIdx) => (
                  <div
                    key={dayIdx}
                    className={cn(
                      "w-4 h-4 rounded-sm",
                      hasWorkout 
                        ? "bg-primary" 
                        : "bg-muted"
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
