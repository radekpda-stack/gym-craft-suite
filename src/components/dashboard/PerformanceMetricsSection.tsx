import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Dumbbell, Trophy, TrendingUp, ChevronRight, Medal } from 'lucide-react';

export type PerformancePeriod = '30days' | '6months' | '12months' | 'all';
type StrengthMetric = '1rm' | 'volume' | 'frequency';

interface TopExercise {
  id: string;
  name: string;
  frequency: number;
  lastPR?: number;
  lastPRDate?: string;
  volume: number;
  topClients: string[];
}

interface PersonalRecord {
  id: string;
  exerciseName: string;
  weight: number;
  reps: number;
  clientName: string;
  date: string;
}

interface PRTimelinePoint {
  label: string;
  date: string;
  prCount: number;
  maxWeight: number;
  exercises: string[];
}

interface StrengthDataPoint {
  label: string;
  [exerciseName: string]: number | string;
}

interface PerformanceMetricsSectionProps {
  topExercises: TopExercise[];
  personalRecords: PersonalRecord[];
  prTimeline: PRTimelinePoint[];
  strengthData: StrengthDataPoint[];
  top3Exercises: string[];
  isLoading: boolean;
  period: PerformancePeriod;
  onPeriodChange: (period: PerformancePeriod) => void;
}

const PERIOD_OPTIONS: { value: PerformancePeriod; label: string }[] = [
  { value: '30days', label: '30 dní' },
  { value: '6months', label: '6 měs.' },
  { value: '12months', label: '12 měs.' },
  { value: 'all', label: 'Celkově' },
];

const STRENGTH_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
];

export function PerformanceMetricsSection({
  topExercises,
  personalRecords,
  prTimeline,
  strengthData,
  top3Exercises,
  isLoading,
  period,
  onPeriodChange,
}: PerformanceMetricsSectionProps) {
  const [strengthMetric, setStrengthMetric] = useState<StrengthMetric>('1rm');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-lg sm:text-xl font-bold text-foreground">
          Výkonnostní metriky
        </h3>
        
        <div className="flex gap-1 p-1 rounded-full bg-secondary/50">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={period === opt.value ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'rounded-full text-xs px-3 h-8',
                period === opt.value && 'bg-primary text-primary-foreground'
              )}
              onClick={() => onPeriodChange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Exercises Card */}
        <div className="glass rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Dumbbell className="w-5 h-5 text-primary" />
            <h4 className="font-semibold text-foreground">Nejčastější cviky</h4>
          </div>
          
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {topExercises.slice(0, 5).map((exercise, index) => (
              <div key={exercise.id} className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <span
                    className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0',
                      index < 3 ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                    )}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {exercise.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {exercise.frequency}× použito
                    </p>
                  </div>
                </div>
                {exercise.lastPR && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-success font-medium">PR: {exercise.lastPR}kg</p>
                  </div>
                )}
              </div>
            ))}
            {topExercises.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Žádné cviky v tomto období
              </p>
            )}
          </div>

          <Link
            to="/progress"
            className="flex items-center justify-center gap-1 mt-3 pt-3 border-t border-border/50 text-xs text-primary hover:text-primary/80"
          >
            Zobrazit vše <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Personal Records Timeline Chart */}
        <div className="glass rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Medal className="w-5 h-5 text-warning" />
            <h4 className="font-semibold text-foreground">Vývoj PR v čase</h4>
          </div>
          
          {prTimeline.length > 0 ? (
            <>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={prTimeline} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                      formatter={(value: number, name: string) => [
                        name === 'prCount' ? `${value} PR` : `${value} kg`,
                        name === 'prCount' ? 'Počet PR' : 'Max váha'
                      ]}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="prCount"
                      fill="hsl(var(--warning))"
                      radius={[4, 4, 0, 0]}
                      name="prCount"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="maxWeight"
                      stroke="hsl(var(--success))"
                      strokeWidth={2}
                      dot={{ r: 3, fill: 'hsl(var(--success))' }}
                      name="maxWeight"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              
              {/* Legend */}
              <div className="flex justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <div className="w-3 h-3 rounded bg-warning" />
                  <span className="text-muted-foreground">Počet PR</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span className="text-muted-foreground">Max váha</span>
                </div>
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
              Žádné PR v tomto období
            </div>
          )}

          <Link
            to="/progress"
            className="flex items-center justify-center gap-1 mt-3 pt-3 border-t border-border/50 text-xs text-primary hover:text-primary/80"
          >
            Zobrazit vše <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Strength Development Chart */}
        <div className="glass rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" />
              <h4 className="font-semibold text-foreground">Vývoj síly</h4>
            </div>
          </div>

          {/* Metric toggle */}
          <div className="flex gap-1 mb-3">
            <Button
              variant={strengthMetric === '1rm' ? 'default' : 'ghost'}
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => setStrengthMetric('1rm')}
            >
              1RM
            </Button>
            <Button
              variant={strengthMetric === 'volume' ? 'default' : 'ghost'}
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => setStrengthMetric('volume')}
            >
              Objem
            </Button>
            <Button
              variant={strengthMetric === 'frequency' ? 'default' : 'ghost'}
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => setStrengthMetric('frequency')}
            >
              Frekvence
            </Button>
          </div>

          {strengthData.length > 0 && top3Exercises.length > 0 ? (
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={strengthData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  {top3Exercises.map((exercise, index) => (
                    <Line
                      key={exercise}
                      type="monotone"
                      dataKey={exercise}
                      stroke={STRENGTH_COLORS[index]}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      name={exercise}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-36 flex items-center justify-center text-muted-foreground text-sm">
              Nedostatek dat pro graf
            </div>
          )}

          {/* Legend */}
          {top3Exercises.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {top3Exercises.map((exercise, index) => (
                <div key={exercise} className="flex items-center gap-1 text-xs">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: STRENGTH_COLORS[index] }}
                  />
                  <span className="text-muted-foreground truncate max-w-[80px]">{exercise}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
