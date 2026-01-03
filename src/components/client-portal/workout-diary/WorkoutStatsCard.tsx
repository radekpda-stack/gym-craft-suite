import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO, differenceInDays, subDays, format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Flame, TrendingUp, Clock, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkoutExercise {
  is_personal_record?: boolean;
  weight_kg?: number | null;
  sets?: number | null;
  reps?: number | null;
}

interface WorkoutLogEntry {
  id: string;
  date: string;
  duration_minutes?: number | null;
  exercises?: WorkoutExercise[];
}

interface WorkoutStatsCardProps {
  logs: WorkoutLogEntry[];
  weeklyGoal?: number;
}

export function WorkoutStatsCard({ logs, weeklyGoal = 4 }: WorkoutStatsCardProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // This week's workouts
    const thisWeekLogs = logs.filter(log => {
      const logDate = parseISO(log.date);
      return isWithinInterval(logDate, { start: weekStart, end: weekEnd });
    });

    // Calculate streak
    let streak = 0;
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (sortedLogs.length > 0) {
      let currentDate = now;
      for (const log of sortedLogs) {
        const logDate = parseISO(log.date);
        const daysDiff = differenceInDays(currentDate, logDate);
        
        if (daysDiff <= 1) {
          streak++;
          currentDate = logDate;
        } else {
          break;
        }
      }
    }

    // Total volume this week (simplified: sum of weight * sets * reps)
    const weeklyVolume = thisWeekLogs.reduce((total, log) => {
      return total + (log.exercises?.reduce((exTotal, ex) => {
        const weight = ex.weight_kg || 0;
        const sets = ex.sets || 0;
        const reps = ex.reps || 1;
        return exTotal + (weight * sets * reps);
      }, 0) || 0);
    }, 0);

    // Total duration this week
    const weeklyDuration = thisWeekLogs.reduce((total, log) => {
      return total + (log.duration_minutes || 0);
    }, 0);

    // PRs this week
    const prsThisWeek = thisWeekLogs.reduce((total, log) => {
      return total + (log.exercises?.filter(ex => ex.is_personal_record).length || 0);
    }, 0);

    return {
      weeklyCount: thisWeekLogs.length,
      streak,
      weeklyVolume,
      weeklyDuration,
      prsThisWeek,
      progress: Math.min((thisWeekLogs.length / weeklyGoal) * 100, 100),
    };
  }, [logs, weeklyGoal]);

  // Activity calendar (last 7 weeks)
  const activityData = useMemo(() => {
    const now = new Date();
    const days: { date: Date; hasWorkout: boolean }[] = [];
    
    for (let i = 48; i >= 0; i--) {
      const date = subDays(now, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const hasWorkout = logs.some(log => log.date === dateStr);
      days.push({ date, hasWorkout });
    }
    
    return days;
  }, [logs]);

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        {/* Weekly progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tento týden</span>
            <span className="font-medium">{stats.weeklyCount}/{weeklyGoal} tréninků</span>
          </div>
          <Progress value={stats.progress} className="h-2" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            <Flame className={cn("w-5 h-5", stats.streak > 0 ? "text-orange-500" : "text-muted-foreground")} />
            <div>
              <div className="text-lg font-bold">{stats.streak}</div>
              <div className="text-xs text-muted-foreground">Série dní</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <div>
              <div className="text-lg font-bold">{stats.weeklyVolume > 0 ? `${(stats.weeklyVolume / 1000).toFixed(1)}t` : '0'}</div>
              <div className="text-xs text-muted-foreground">Objem</div>
            </div>
          </div>

          {stats.weeklyDuration > 0 && (
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <Clock className="w-5 h-5 text-green-500" />
              <div>
                <div className="text-lg font-bold">{stats.weeklyDuration} min</div>
                <div className="text-xs text-muted-foreground">Čas</div>
              </div>
            </div>
          )}

          {stats.prsThisWeek > 0 && (
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <div>
                <div className="text-lg font-bold">{stats.prsThisWeek}</div>
                <div className="text-xs text-muted-foreground">PR tento týden</div>
              </div>
            </div>
          )}
        </div>

        {/* Activity calendar */}
        <div className="pt-2">
          <div className="text-xs text-muted-foreground mb-2">Aktivita (7 týdnů)</div>
          <div className="flex flex-wrap gap-1">
            {activityData.map((day, idx) => (
              <div
                key={idx}
                title={format(day.date, 'd. MMMM', { locale: cs })}
                className={cn(
                  "w-3 h-3 rounded-sm",
                  day.hasWorkout ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
