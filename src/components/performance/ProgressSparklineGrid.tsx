/**
 * ProgressSparklineGrid - Grid of mini sparkline charts for exercise progress
 * Design: Compact cards with area charts and trend indicators
 */
import { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Trophy, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { ExerciseProgress } from '@/hooks/useClientProgressStats';

interface ProgressSparklineGridProps {
  exercises: ExerciseProgress[];
  isLoading?: boolean;
  onExerciseClick?: (exercise: ExerciseProgress) => void;
}

function formatValue(value: number, unit: string): string {
  if (unit === 's') {
    return formatDuration(value);
  }
  if (unit === 'm' && value >= 1000) {
    return `${(value / 1000).toFixed(1)}km`;
  }
  if (unit === 'kg') {
    return `${Math.round(value)}kg`;
  }
  return `${Math.round(value)}${unit === 'reps' ? '' : unit}`;
}

function SparklineCard({ exercise, onClick }: { exercise: ExerciseProgress; onClick?: () => void }) {
  // Prepare chart data - for inverted metrics (time), we flip the visual
  const chartData = useMemo(() => {
    if (exercise.isInverted) {
      // For time-based, invert so improvement shows as upward trend
      const maxVal = Math.max(...exercise.sparklineData.map(d => d.value));
      return exercise.sparklineData.map(d => ({
        ...d,
        displayValue: maxVal - d.value + 1,
      }));
    }
    return exercise.sparklineData.map(d => ({ ...d, displayValue: d.value }));
  }, [exercise]);

  const isPositive = exercise.changePercent > 0;
  const isNegative = exercise.changePercent < 0;
  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  // Sanitize ID for gradient
  const gradientId = `spark-${exercise.exerciseName.replace(/[^a-zA-Z0-9]/g, '-')}`;

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative w-full p-4 rounded-xl text-left',
        'bg-card/80 backdrop-blur-md border border-border/50',
        'hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary/30'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">
            {exercise.exerciseName}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {exercise.entryCount} záznamů
          </p>
        </div>
        {exercise.prCount > 0 && (
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-warning/10 text-warning">
            <Trophy className="w-2.5 h-2.5" />
            <span className="text-[10px] font-medium">{exercise.prCount}</span>
          </div>
        )}
      </div>

      {/* Sparkline Chart */}
      <div className="h-10 mb-3 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="displayValue"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Values and Trend */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-lg font-bold tabular-nums">
            {formatValue(exercise.lastValue, exercise.unit)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            z {formatValue(exercise.firstValue, exercise.unit)}
          </p>
        </div>
        <div className={cn(
          'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
          isPositive && 'bg-emerald-500/10 text-emerald-500',
          isNegative && 'bg-destructive/10 text-destructive',
          !isPositive && !isNegative && 'bg-muted text-muted-foreground'
        )}>
          <TrendIcon className="w-3 h-3" />
          <span className="tabular-nums">
            {isPositive && '+'}{exercise.changePercent}%
          </span>
        </div>
      </div>

      {/* Hover arrow */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </button>
  );
}

export function ProgressSparklineGrid({
  exercises,
  isLoading,
  onExerciseClick,
}: ProgressSparklineGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">Zatím žádné cviky s dostatečnou historií</p>
        <p className="text-xs mt-1">Potřeba alespoň 2 záznamy pro zobrazení trendu</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {exercises.map(exercise => (
        <SparklineCard
          key={exercise.exerciseId || exercise.exerciseName}
          exercise={exercise}
          onClick={() => onExerciseClick?.(exercise)}
        />
      ))}
    </div>
  );
}
