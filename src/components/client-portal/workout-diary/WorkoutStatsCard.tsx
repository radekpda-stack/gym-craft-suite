import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO, differenceInDays, subDays, format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Flame, TrendingUp, Clock, Trophy, Download } from 'lucide-react';
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
  workout_type?: string | null;
  notes?: string | null;
}

interface WorkoutStatsCardProps {
  logs: WorkoutLogEntry[];
  weeklyGoal?: number;
  onExport?: (format: 'pdf' | 'csv') => void;
}

type StatsPeriod = 'week' | 'month' | '3months';

export function WorkoutStatsCard({ logs, weeklyGoal = 4, onExport }: WorkoutStatsCardProps) {
  const [period, setPeriod] = useState<StatsPeriod>('week');

  const stats = useMemo(() => {
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date = now;

    switch (period) {
      case 'week':
        periodStart = startOfWeek(now, { weekStartsOn: 1 });
        periodEnd = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        periodStart = startOfMonth(now);
        periodEnd = endOfMonth(now);
        break;
      case '3months':
        periodStart = subMonths(startOfMonth(now), 2);
        periodEnd = endOfMonth(now);
        break;
      default:
        periodStart = startOfWeek(now, { weekStartsOn: 1 });
        periodEnd = endOfWeek(now, { weekStartsOn: 1 });
    }

    // Filter logs by period
    const periodLogs = logs.filter(log => {
      const logDate = parseISO(log.date);
      return isWithinInterval(logDate, { start: periodStart, end: periodEnd });
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

    // Total volume (sum of weight * sets * reps)
    const periodVolume = periodLogs.reduce((total, log) => {
      return total + (log.exercises?.reduce((exTotal, ex) => {
        const weight = ex.weight_kg || 0;
        const sets = ex.sets || 0;
        const reps = ex.reps || 1;
        return exTotal + (weight * sets * reps);
      }, 0) || 0);
    }, 0);

    // Total duration
    const periodDuration = periodLogs.reduce((total, log) => {
      return total + (log.duration_minutes || 0);
    }, 0);

    // PRs in period
    const prsPeriod = periodLogs.reduce((total, log) => {
      return total + (log.exercises?.filter(ex => ex.is_personal_record).length || 0);
    }, 0);

    // Progress calculation
    const progressGoal = period === 'week' ? weeklyGoal : period === 'month' ? weeklyGoal * 4 : weeklyGoal * 12;
    const progress = Math.min((periodLogs.length / progressGoal) * 100, 100);

    return {
      count: periodLogs.length,
      streak,
      volume: periodVolume,
      duration: periodDuration,
      prs: prsPeriod,
      progress,
      goal: progressGoal,
    };
  }, [logs, period, weeklyGoal]);

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

  const periodLabel = period === 'week' ? 'Tento týden' : period === 'month' ? 'Tento měsíc' : 'Poslední 3 měsíce';

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        {/* Period selector */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <Button
              variant={period === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriod('week')}
              className="h-7 text-xs"
            >
              Týden
            </Button>
            <Button
              variant={period === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriod('month')}
              className="h-7 text-xs"
            >
              Měsíc
            </Button>
            <Button
              variant={period === '3months' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriod('3months')}
              className="h-7 text-xs"
            >
              3 měsíce
            </Button>
          </div>
          {onExport && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onExport('csv')}
                className="h-7 text-xs"
              >
                <Download className="w-3 h-3 mr-1" />
                CSV
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onExport('pdf')}
                className="h-7 text-xs"
              >
                <Download className="w-3 h-3 mr-1" />
                PDF
              </Button>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{periodLabel}</span>
            <span className="font-medium">{stats.count}/{stats.goal} tréninků</span>
          </div>
          <Progress value={stats.progress} className="h-2" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            <Flame className={cn("w-5 h-5", stats.streak > 0 ? "text-warning" : "text-muted-foreground")} />
            <div>
              <div className="text-lg font-bold">{stats.streak}</div>
              <div className="text-xs text-muted-foreground">Série dní</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-accent" />
            <div>
              <div className="text-lg font-bold">{stats.volume > 0 ? `${(stats.volume / 1000).toFixed(1)}t` : '0'}</div>
              <div className="text-xs text-muted-foreground">Objem</div>
            </div>
          </div>

          {stats.duration > 0 && (
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <Clock className="w-5 h-5 text-success" />
              <div>
                <div className="text-lg font-bold">{stats.duration} min</div>
                <div className="text-xs text-muted-foreground">Čas</div>
              </div>
            </div>
          )}

          {stats.prs > 0 && (
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <Trophy className="w-5 h-5 text-warning" />
              <div>
                <div className="text-lg font-bold">{stats.prs}</div>
                <div className="text-xs text-muted-foreground">PR</div>
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
