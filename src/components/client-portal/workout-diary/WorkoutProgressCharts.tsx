import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, parseISO, startOfWeek, endOfWeek, eachWeekOfInterval, subMonths, isWithinInterval } from 'date-fns';
import { cs } from 'date-fns/locale';
import { TrendingUp, BarChart3, Activity } from 'lucide-react';

interface WorkoutExercise {
  exercise_name: string;
  weight_kg?: number | null;
  sets?: number | null;
  reps?: number | null;
}

interface WorkoutLogEntry {
  id: string;
  date: string;
  duration_minutes?: number | null;
  workout_type?: string | null;
  exercises?: WorkoutExercise[];
}

interface WorkoutProgressChartsProps {
  logs: WorkoutLogEntry[];
}

type ChartView = 'volume' | 'frequency' | 'exercise';

export function WorkoutProgressCharts({ logs }: WorkoutProgressChartsProps) {
  const [chartView, setChartView] = useState<ChartView>('volume');
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [period, setPeriod] = useState<'3m' | '6m' | '1y'>('3m');

  // Get period range
  const periodMonths = period === '3m' ? 3 : period === '6m' ? 6 : 12;
  const periodStart = subMonths(new Date(), periodMonths);

  // Filter logs by period
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const logDate = parseISO(log.date);
      return logDate >= periodStart;
    });
  }, [logs, periodStart]);

  // Get unique exercises
  const uniqueExercises = useMemo(() => {
    const exercises = new Set<string>();
    filteredLogs.forEach(log => {
      log.exercises?.forEach(ex => {
        if (ex.exercise_name) {
          exercises.add(ex.exercise_name);
        }
      });
    });
    return Array.from(exercises).sort();
  }, [filteredLogs]);

  // Volume data (weekly)
  const volumeData = useMemo(() => {
    if (filteredLogs.length === 0) return [];

    const weeks = eachWeekOfInterval(
      { start: periodStart, end: new Date() },
      { weekStartsOn: 1 }
    );

    return weeks.map(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekLogs = filteredLogs.filter(log => {
        const logDate = parseISO(log.date);
        return isWithinInterval(logDate, { start: weekStart, end: weekEnd });
      });

      const volume = weekLogs.reduce((total, log) => {
        return total + (log.exercises?.reduce((exTotal, ex) => {
          const weight = ex.weight_kg || 0;
          const sets = ex.sets || 0;
          const reps = ex.reps || 1;
          return exTotal + (weight * sets * reps);
        }, 0) || 0);
      }, 0);

      return {
        week: format(weekStart, 'd.M', { locale: cs }),
        volume: Math.round(volume / 1000), // in tons
        workouts: weekLogs.length,
      };
    });
  }, [filteredLogs, periodStart]);

  // Frequency data (weekly workouts)
  const frequencyData = useMemo(() => {
    if (filteredLogs.length === 0) return [];

    const weeks = eachWeekOfInterval(
      { start: periodStart, end: new Date() },
      { weekStartsOn: 1 }
    );

    return weeks.map(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekLogs = filteredLogs.filter(log => {
        const logDate = parseISO(log.date);
        return isWithinInterval(logDate, { start: weekStart, end: weekEnd });
      });

      const duration = weekLogs.reduce((total, log) => total + (log.duration_minutes || 0), 0);

      return {
        week: format(weekStart, 'd.M', { locale: cs }),
        workouts: weekLogs.length,
        duration,
      };
    });
  }, [filteredLogs, periodStart]);

  // Exercise progression data
  const exerciseData = useMemo(() => {
    if (!selectedExercise || filteredLogs.length === 0) return [];

    const progressData: { date: string; weight: number; volume: number }[] = [];

    filteredLogs.forEach(log => {
      const exercise = log.exercises?.find(ex => ex.exercise_name === selectedExercise);
      if (exercise && exercise.weight_kg) {
        progressData.push({
          date: format(parseISO(log.date), 'd.M', { locale: cs }),
          weight: exercise.weight_kg,
          volume: (exercise.weight_kg || 0) * (exercise.sets || 1) * (exercise.reps || 1),
        });
      }
    });

    return progressData;
  }, [filteredLogs, selectedExercise]);

  if (filteredLogs.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Vývoj tréninků
          </CardTitle>
          
          <div className="flex gap-2">
            <Select value={period} onValueChange={(v: '3m' | '6m' | '1y') => setPeriod(v)}>
              <SelectTrigger className="w-[80px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3m">3 měsíce</SelectItem>
                <SelectItem value="6m">6 měsíců</SelectItem>
                <SelectItem value="1y">1 rok</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Chart type tabs */}
        <div className="flex gap-1 mt-2">
          <Button
            variant={chartView === 'volume' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setChartView('volume')}
            className="h-7 text-xs gap-1"
          >
            <TrendingUp className="w-3 h-3" />
            Objem
          </Button>
          <Button
            variant={chartView === 'frequency' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setChartView('frequency')}
            className="h-7 text-xs gap-1"
          >
            <BarChart3 className="w-3 h-3" />
            Frekvence
          </Button>
          <Button
            variant={chartView === 'exercise' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setChartView('exercise')}
            className="h-7 text-xs gap-1"
          >
            <Activity className="w-3 h-3" />
            Cvik
          </Button>
        </div>
        
        {/* Exercise selector for exercise view */}
        {chartView === 'exercise' && (
          <Select value={selectedExercise} onValueChange={setSelectedExercise}>
            <SelectTrigger className="w-full mt-2 h-8 text-xs">
              <SelectValue placeholder="Vyber cvik..." />
            </SelectTrigger>
            <SelectContent>
              {uniqueExercises.map(ex => (
                <SelectItem key={ex} value={ex}>{ex}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardHeader>
      
      <CardContent className="pt-2">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            {chartView === 'volume' ? (
              <LineChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="week" 
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  tickFormatter={(value) => `${value}t`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [`${value} tun`, 'Objem']}
                />
                <Line 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            ) : chartView === 'frequency' ? (
              <BarChart data={frequencyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="week" 
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'workouts' ? `${value} tréninků` : `${value} min`,
                    name === 'workouts' ? 'Tréninků' : 'Čas'
                  ]}
                />
                <Bar dataKey="workouts" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={exerciseData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  tickFormatter={(value) => `${value}kg`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number, name: string) => [
                    `${value} ${name === 'weight' ? 'kg' : ''}`,
                    name === 'weight' ? 'Váha' : 'Objem'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="weight" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
        
        {chartView === 'exercise' && !selectedExercise && (
          <p className="text-center text-sm text-muted-foreground mt-2">
            Vyber cvik pro zobrazení progrese
          </p>
        )}
        
        {chartView === 'exercise' && selectedExercise && exerciseData.length === 0 && (
          <p className="text-center text-sm text-muted-foreground mt-2">
            Pro tento cvik nejsou dostupná data s váhou
          </p>
        )}
      </CardContent>
    </Card>
  );
}
