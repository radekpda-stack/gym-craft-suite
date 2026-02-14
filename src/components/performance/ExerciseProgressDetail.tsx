/**
 * ExerciseProgressDetail - Shared inline detail view for exercise progress
 * Used in both Performance > Klienti and Cviky > Klient views
 * Shows: progress chart, stats (max weight/best time, PR count, trend), history
 */
import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  ArrowLeft, Trophy, Target, Dumbbell, Heart, Calendar,
  TrendingUp, TrendingDown, Minus, Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useExerciseHistory } from '@/hooks/useExerciseHistory';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts';
import { motion } from 'framer-motion';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export interface ExerciseProgressDetailProps {
  clientId: string;
  clientName: string;
  exerciseName: string;
  exerciseId: string | null;
  /** 'strength' | 'cardio' | 'skill' */
  exerciseType: string;
  isTimeBased: boolean;
  onBack: () => void;
}

export function ExerciseProgressDetail({
  clientId,
  clientName,
  exerciseName,
  exerciseId,
  exerciseType,
  isTimeBased,
  onBack,
}: ExerciseProgressDetailProps) {
  const { data: history = [], isLoading } = useExerciseHistory(
    clientId,
    exerciseName,
    exerciseId,
    null,
  );

  // Build chart data from history (reversed to chronological)
  const chartData = useMemo(() => {
    return [...history].reverse().map(entry => {
      const value = isTimeBased
        ? (entry.time_seconds || 0)
        : (entry.weight_kg || entry.reps || 0);
      return {
        date: format(parseISO(entry.date), 'd. M.', { locale: cs }),
        fullDate: format(parseISO(entry.date), 'd. MMMM yyyy', { locale: cs }),
        value,
        displayValue: entry.displayValue,
        reps: entry.reps,
      };
    });
  }, [history, isTimeBased]);

  // Stats
  const stats = useMemo(() => {
    if (chartData.length < 2) return { maxValue: 0, prCount: 0, trend: 0, trendPositive: false };
    const values = chartData.map(d => d.value).filter(v => v > 0);
    const maxValue = isTimeBased ? Math.min(...values) : Math.max(...values);
    const first = chartData[0].value;
    const last = chartData[chartData.length - 1].value;
    const trend = last - first;
    const trendPositive = isTimeBased ? trend < 0 : trend > 0;
    return { maxValue, prCount: 0, trend, trendPositive };
  }, [chartData, isTimeBased]);

  const TrendIcon = stats.trendPositive ? TrendingUp : stats.trend !== 0 ? TrendingDown : Minus;
  const trendColor = stats.trendPositive ? 'text-success' : stats.trend !== 0 ? 'text-destructive' : 'text-muted-foreground';

  const getIcon = () => {
    if (exerciseType === 'cardio') return <Heart className="w-5 h-5 text-success" />;
    if (exerciseType === 'skill') return <Zap className="w-5 h-5 text-warning" />;
    return <Dumbbell className="w-5 h-5 text-primary" />;
  };

  const getIconBg = () => {
    if (exerciseType === 'cardio') return 'bg-success/10';
    if (exerciseType === 'skill') return 'bg-warning/10';
    return 'bg-primary/10';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", getIconBg())}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{exerciseName}</h3>
          <p className="text-sm text-muted-foreground">{clientName}</p>
        </div>
      </div>

      {/* Stats Row */}
      {!isLoading && chartData.length >= 2 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Target className="w-3.5 h-3.5" />
              {isTimeBased ? 'Nejlepší čas' : 'Max váha'}
            </div>
            <p className="text-lg font-bold tabular-nums">
              {isTimeBased ? formatTime(stats.maxValue) : `${stats.maxValue} kg`}
            </p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Calendar className="w-3.5 h-3.5" />
              Záznamů
            </div>
            <p className="text-lg font-bold tabular-nums">{history.length}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TrendIcon className={cn("w-3.5 h-3.5", trendColor)} />
              Trend
            </div>
            <p className={cn("text-lg font-bold tabular-nums", trendColor)}>
              {stats.trend > 0 ? '+' : ''}
              {isTimeBased ? `${Math.abs(Math.round(stats.trend))}s` : `${Math.abs(stats.trend)} kg`}
            </p>
          </Card>
        </div>
      )}

      {/* Progress Chart */}
      {isLoading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : chartData.length > 1 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Progrese</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    domain={isTimeBased ? ['dataMin - 10', 'dataMax + 10'] : ['dataMin - 5', 'dataMax + 5']}
                    tickFormatter={(value) => isTimeBased ? formatTime(value) : `${value}`}
                    width={45}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border rounded-lg p-2 shadow-lg text-xs">
                          <p className="font-medium">{data.fullDate}</p>
                          <p className="text-muted-foreground">
                            {data.displayValue}
                            {!isTimeBased && data.reps ? ` × ${data.reps}` : ''}
                          </p>
                        </div>
                      );
                    }}
                  />
                  {stats.maxValue > 0 && (
                    <ReferenceLine
                      y={stats.maxValue}
                      stroke="hsl(var(--primary))"
                      strokeDasharray="4 4"
                      strokeOpacity={0.5}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Potřeba alespoň 2 záznamy pro zobrazení grafu
        </div>
      )}

      {/* History List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Historie záznamů ({history.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Žádné záznamy</p>
          ) : (
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {history.map((entry, index) => (
                <div
                  key={entry.id}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-lg",
                    index === 0 ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-muted-foreground w-16">
                      {format(parseISO(entry.date), 'd. M. yy', { locale: cs })}
                    </div>
                    <span className="font-medium tabular-nums">{entry.displayValue}</span>
                  </div>
                  {index === 0 && (
                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                      Poslední
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
