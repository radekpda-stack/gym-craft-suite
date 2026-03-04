import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getRpeBgColor } from '@/lib/exerciseMetrics';
import {
  Dumbbell, Heart, Zap, ChevronRight, TrendingUp, TrendingDown, Minus,
  Timer, Ruler,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { motion } from 'framer-motion';
import type { ClientExerciseProgress } from '@/hooks/useClientAllExercises';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function RpeBadge({ rpe }: { rpe: number }) {
  return (
    <Badge className={cn("text-[10px] px-1.5 py-0 h-4 shrink-0", getRpeBgColor(rpe))}>
      RPE {rpe}
    </Badge>
  );
}

interface ExerciseListItemProps {
  exercise: ClientExerciseProgress;
  onClick: () => void;
}

export function ExerciseListItem({ exercise, onClick }: ExerciseListItemProps) {
  const { exerciseType } = exercise;

  const borderColor = exerciseType === 'cardio' ? 'border-l-success'
    : exerciseType === 'skill' ? 'border-l-warning'
    : 'border-l-primary';

  const iconBg = exerciseType === 'cardio' ? 'bg-success/10'
    : exerciseType === 'skill' ? 'bg-warning/10'
    : 'bg-primary/10';

  const iconColor = exerciseType === 'cardio' ? 'text-success'
    : exerciseType === 'skill' ? 'text-warning'
    : 'text-primary';

  const icon = exerciseType === 'cardio'
    ? <Heart className={cn("w-5 h-5", iconColor)} />
    : exerciseType === 'skill'
    ? <Zap className={cn("w-5 h-5", iconColor)} />
    : <Dumbbell className={cn("w-5 h-5", iconColor)} />;

  const latestEntry = exercise.data[exercise.data.length - 1];

  const trend = (() => {
    const d = exercise.data;
    if (d.length < 2) return null;
    const latest = exercise.isTimeBased ? d[d.length - 1].timeSeconds : d[d.length - 1].weight;
    const prev = exercise.isTimeBased ? d[d.length - 2].timeSeconds : d[d.length - 2].weight;
    if (!latest || !prev) return null;
    const improved = exercise.isTimeBased ? latest < prev : latest > prev;
    const worsened = exercise.isTimeBased ? latest > prev : latest < prev;
    if (improved) return { icon: <TrendingUp className="w-3.5 h-3.5 text-success" />, label: 'text-success' };
    if (worsened) return { icon: <TrendingDown className="w-3.5 h-3.5 text-destructive" />, label: 'text-destructive' };
    return { icon: <Minus className="w-3.5 h-3.5 text-muted-foreground" />, label: '' };
  })();

  const latestRpe = latestEntry?.rpe;
  const latestWatts = latestEntry?.avgWatts;
  const latestHR = latestEntry?.avgHeartRate;
  const latestDistance = latestEntry?.distanceMeters;

  const primaryTime = (exerciseType === 'cardio' || exercise.isTimeBased) && exercise.bestTime
    ? formatTime(exercise.bestTime) : null;
  const primaryWeight = (!exercise.isTimeBased && exerciseType === 'strength' && exercise.maxWeight)
    ? exercise.maxWeight : null;
  const primaryReps = primaryWeight && latestEntry?.reps ? latestEntry.reps : null;

  const distanceStr = latestDistance
    ? latestDistance >= 1000
      ? `${(latestDistance / 1000).toFixed(1)} km`
      : `${Math.round(latestDistance)} m`
    : null;

  return (
    <motion.button
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.998 }}
      onClick={onClick}
      className={cn(
        "w-full flex flex-col gap-2.5 p-4 rounded-xl bg-card border-l-4 border border-border/60",
        "hover:shadow-md transition-all duration-200 text-left",
        borderColor
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm", iconBg)}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm leading-snug truncate">{exercise.exerciseName}</p>
            {exercise.prCount > 0 && (
              <Badge className="text-[9px] px-1 py-0 h-4 bg-warning/15 text-warning border border-warning/30 font-semibold">
                🏆 {exercise.prCount} PR
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-muted-foreground">{exercise.count} záz.</span>
            <span className="text-[11px] text-muted-foreground/50">·</span>
            <span className="text-[11px] text-muted-foreground">
              {format(parseISO(exercise.lastDate), 'd. M. yy', { locale: cs })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {trend?.icon}
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      <div className="flex items-center gap-3 pl-[52px] flex-wrap">
        {primaryTime && (
          <div className="flex items-center gap-1">
            <Timer className="w-3.5 h-3.5 text-muted-foreground/60" />
            <span className="font-bold text-base tabular-nums">{primaryTime}</span>
          </div>
        )}
        {primaryWeight && (
          <>
            {primaryReps && (
              <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                {primaryReps}×
              </span>
            )}
            <span className="font-bold text-base tabular-nums">{primaryWeight} kg</span>
          </>
        )}
        {distanceStr && (
          <div className="flex items-center gap-1">
            <Ruler className="w-3.5 h-3.5 text-muted-foreground/60" />
            <span className="text-sm font-semibold tabular-nums">{distanceStr}</span>
          </div>
        )}
        {latestWatts && latestWatts > 0 && (
          <div className="flex items-center gap-0.5">
            <Zap className="w-3.5 h-3.5 text-warning" />
            <span className="text-sm font-semibold tabular-nums text-warning">{Math.round(latestWatts)} W</span>
          </div>
        )}
        {latestHR && latestHR > 0 && (
          <div className="flex items-center gap-0.5">
            <Heart className="w-3.5 h-3.5 text-muted-foreground/60" />
            <span className="text-sm tabular-nums">{latestHR}</span>
          </div>
        )}
        {latestRpe && <RpeBadge rpe={latestRpe} />}
      </div>
    </motion.button>
  );
}
