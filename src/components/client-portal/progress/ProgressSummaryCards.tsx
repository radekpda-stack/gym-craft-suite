import { Scale, Percent, Dumbbell, TrendingUp, TrendingDown, Minus, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { MeasurementDataPoint, TrackedExerciseProgress } from '@/hooks/useClientProgressData';
import { AddMeasurementDialog } from './AddMeasurementDialog';

interface ProgressSummaryCardsProps {
  weightData: MeasurementDataPoint[];
  bodyFatData: MeasurementDataPoint[];
  trackedExercises: TrackedExerciseProgress[];
  isLoading?: boolean;
}

interface SummaryCardProps {
  icon: React.ReactNode;
  title: string;
  current?: string;
  change?: number;
  changeSuffix?: string;
  lastDate?: string;
  emptyText?: string;
  addAction?: React.ReactNode;
  isLoading?: boolean;
}

function SummaryCard({
  icon,
  title,
  current,
  change,
  changeSuffix = '',
  lastDate,
  emptyText = 'Žádná data',
  addAction,
  isLoading,
}: SummaryCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasData = current !== undefined;

  const TrendIcon = change !== undefined 
    ? change > 0 
      ? TrendingUp 
      : change < 0 
        ? TrendingDown 
        : Minus
    : null;

  const trendColor = change !== undefined
    ? change < 0
      ? 'text-success'
      : change > 0
        ? 'text-destructive'
        : 'text-muted-foreground'
    : '';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-0.5">{title}</p>
            {hasData ? (
              <>
                <p className="text-xl font-bold truncate">{current}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {TrendIcon && change !== undefined && (
                    <span className={cn("flex items-center gap-0.5 text-xs font-medium", trendColor)}>
                      <TrendIcon className="w-3 h-3" />
                      {change > 0 ? '+' : ''}{change.toFixed(1)}{changeSuffix}
                    </span>
                  )}
                  {lastDate && (
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(lastDate), 'd. M.', { locale: cs })}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <p className="text-sm text-muted-foreground">{emptyText}</p>
                {addAction}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProgressSummaryCards({
  weightData,
  bodyFatData,
  trackedExercises,
  isLoading,
}: ProgressSummaryCardsProps) {
  // Calculate weight summary
  const latestWeight = weightData[weightData.length - 1];
  const firstWeight = weightData[0];
  const weightChange = latestWeight && firstWeight 
    ? latestWeight.value - firstWeight.value 
    : undefined;

  // Calculate body fat summary
  const latestBodyFat = bodyFatData[bodyFatData.length - 1];
  const firstBodyFat = bodyFatData[0];
  const bodyFatChange = latestBodyFat && firstBodyFat 
    ? latestBodyFat.value - firstBodyFat.value 
    : undefined;

  // Calculate exercise summary (first tracked exercise)
  const firstExercise = trackedExercises[0];
  const latestExerciseEntry = firstExercise?.data[firstExercise.data.length - 1];
  const firstExerciseEntry = firstExercise?.data[0];
  const exerciseChange = latestExerciseEntry && firstExerciseEntry
    ? latestExerciseEntry.weight - firstExerciseEntry.weight
    : undefined;

  // Find PR
  const exercisePR = firstExercise?.data.reduce((max, entry) => 
    entry.weight > max ? entry.weight : max, 0
  );

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
      <SummaryCard
        icon={<Scale className="w-5 h-5 text-primary" />}
        title="Váha"
        current={latestWeight ? `${latestWeight.value} kg` : undefined}
        change={weightChange}
        changeSuffix=" kg"
        lastDate={latestWeight?.date}
        emptyText="Zatím žádné měření"
        addAction={
          <AddMeasurementDialog 
            defaultType="weight"
            trigger={
              <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs">
                <Plus className="w-3 h-3" />
                Přidat
              </Button>
            }
          />
        }
        isLoading={isLoading}
      />

      <SummaryCard
        icon={<Percent className="w-5 h-5 text-primary" />}
        title="Tělesný tuk"
        current={latestBodyFat ? `${latestBodyFat.value}%` : undefined}
        change={bodyFatChange}
        changeSuffix="%"
        lastDate={latestBodyFat?.date}
        emptyText="Zatím žádné měření"
        addAction={
          <AddMeasurementDialog 
            defaultType="bodyFat"
            trigger={
              <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs">
                <Plus className="w-3 h-3" />
                Přidat
              </Button>
            }
          />
        }
        isLoading={isLoading}
      />

      <SummaryCard
        icon={<Dumbbell className="w-5 h-5 text-primary" />}
        title={firstExercise?.exerciseName || 'Sledovaný cvik'}
        current={latestExerciseEntry ? `${latestExerciseEntry.weight} kg` : undefined}
        change={exerciseChange}
        changeSuffix=" kg"
        lastDate={latestExerciseEntry?.date}
        emptyText="Trenér zatím neoznačil cvik"
        isLoading={isLoading}
      />
    </div>
  );
}
