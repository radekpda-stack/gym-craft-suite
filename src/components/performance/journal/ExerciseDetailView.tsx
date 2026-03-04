import { useMemo } from 'react';
import {
  Trophy, Plus, Dumbbell, Heart, Zap, ArrowLeft,
  TrendingUp, TrendingDown, Minus, Timer, Ruler, Activity, Calendar, Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useExerciseHistory } from '@/hooks/useExerciseHistory';
import { cn } from '@/lib/utils';
import { getRpeBgColor } from '@/lib/exerciseMetrics';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts';
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

interface ExerciseDetailViewProps {
  clientId: string;
  clientName: string;
  exercise: ClientExerciseProgress;
  onBack: () => void;
  onQuickLog: (exerciseName?: string) => void;
}

export function ExerciseDetailView({ clientId, clientName, exercise, onBack, onQuickLog }: ExerciseDetailViewProps) {
  const { data: history = [], isLoading } = useExerciseHistory(clientId, exercise.exerciseName, null, null);

  const { exerciseType } = exercise;
  const isCardio = exerciseType === 'cardio';
  const isSkill = exerciseType === 'skill';
  const isStrength = exerciseType === 'strength' && !exercise.isTimeBased;

  const chartData = useMemo(() => {
    return [...exercise.data].map(d => ({
      date: format(parseISO(d.date), 'd.M.', { locale: cs }),
      fullDate: format(parseISO(d.date), 'd. MMMM yyyy', { locale: cs }),
      value: exercise.isTimeBased ? d.timeSeconds : d.weight,
      distance: d.distanceMeters,
      rpe: d.rpe,
      displayValue: exercise.isTimeBased && d.timeSeconds
        ? formatTime(d.timeSeconds)
        : d.weight ? `${d.weight} kg`
        : d.distanceMeters ? `${Math.round(d.distanceMeters)} m` : '-',
      reps: d.reps,
      isPR: d.isPR,
      avgWatts: d.avgWatts,
    }));
  }, [exercise.data, exercise.isTimeBased]);

  const trend = useMemo(() => {
    if (chartData.length < 2) return { change: 0, positive: false };
    const first = chartData[0].value || 0;
    const last = chartData[chartData.length - 1].value || 0;
    const change = last - first;
    const positive = exercise.isTimeBased ? change < 0 : change > 0;
    return { change, positive };
  }, [chartData, exercise.isTimeBased]);

  const TrendIcon = trend.positive ? TrendingUp : trend.change !== 0 ? TrendingDown : Minus;
  const trendColor = trend.positive ? 'text-success' : trend.change !== 0 ? 'text-destructive' : 'text-muted-foreground';
  const bestValue = exercise.isTimeBased ? exercise.bestTime : exercise.maxWeight;

  const typeIcon = isCardio ? <Heart className="w-4 h-4 text-success" />
    : isSkill ? <Zap className="w-4 h-4 text-warning" />
    : <Dumbbell className="w-4 h-4 text-primary" />;
  const typeBg = isCardio ? 'bg-success/10' : isSkill ? 'bg-warning/10' : 'bg-primary/10';
  const typeLabel = isCardio ? 'Kardio' : isSkill ? 'Skill / Plyo' : 'Síla';
  const typeBadgeClass = isCardio ? 'border-success/30 text-success bg-success/10'
    : isSkill ? 'border-warning/30 text-warning bg-warning/10'
    : 'border-primary/30 text-primary bg-primary/10';
  const strokeColor = isCardio ? 'hsl(var(--success))' : isSkill ? 'hsl(var(--warning))' : 'hsl(var(--primary))';
  const gradientId = `grad-${exercise.exerciseName.replace(/\s+/g, '')}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-9 w-9">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm", typeBg)}>
          {typeIcon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base leading-tight truncate">{exercise.exerciseName}</h3>
            <Badge variant="outline" className={cn("text-[10px] shrink-0 h-5 px-1.5", typeBadgeClass)}>
              {typeLabel}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{clientName}</p>
        </div>
        <Button size="sm" className="shrink-0 gap-1.5 h-8" onClick={() => onQuickLog(exercise.exerciseName)}>
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Přidat</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className={cn("rounded-xl p-3 border", typeBg, "border-border/40")}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Target className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
              {isStrength ? 'Max váha' : isCardio ? 'Nejlepší čas' : 'Záznamů'}
            </span>
          </div>
          <p className="text-2xl font-bold tabular-nums">
            {isStrength && exercise.maxWeight ? `${exercise.maxWeight} kg`
              : exercise.bestTime ? formatTime(exercise.bestTime) : exercise.count}
          </p>
        </div>

        {isCardio && exercise.bestDistance ? (
          <div className="rounded-xl p-3 border bg-success/5 border-border/40">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Ruler className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Vzdálenost</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {exercise.bestDistance >= 1000 ? `${(exercise.bestDistance / 1000).toFixed(1)} km` : `${Math.round(exercise.bestDistance)} m`}
            </p>
          </div>
        ) : (
          <div className="rounded-xl p-3 border bg-warning/5 border-border/40">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Trophy className="w-3.5 h-3.5 text-warning" />
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide">PR celkem</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-warning">{exercise.prCount}</p>
          </div>
        )}

        <div className="rounded-xl p-3 border bg-card border-border/40">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendIcon className={cn("w-3.5 h-3.5", trendColor)} />
            <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Trend</span>
          </div>
          <p className={cn("text-2xl font-bold tabular-nums", trendColor)}>
            {trend.change === 0 ? '—'
              : exercise.isTimeBased
              ? `${trend.change > 0 ? '+' : ''}${Math.round(Math.abs(trend.change))}s`
              : `${trend.change > 0 ? '+' : ''}${Math.abs(trend.change).toFixed(1)} kg`}
          </p>
        </div>

        {exercise.avgRpe ? (
          <div className="rounded-xl p-3 border bg-card border-border/40">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Activity className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Ø RPE</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{exercise.avgRpe}</p>
            <p className="text-[10px] text-muted-foreground">/ 10</p>
          </div>
        ) : (
          <div className="rounded-xl p-3 border bg-card border-border/40">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Záznamy</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{exercise.count}</p>
          </div>
        )}
      </div>

      {/* Progress Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              Progrese
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={strokeColor} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis
                    tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                    domain={exercise.isTimeBased ? ['dataMin - 10', 'dataMax + 10'] : ['dataMin - 5', 'dataMax + 5']}
                    tickFormatter={(v) => exercise.isTimeBased ? formatTime(v) : `${v}`}
                    width={exercise.isTimeBased ? 42 : 32}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-popover border rounded-lg p-2.5 shadow-lg text-xs max-w-[180px] space-y-0.5">
                          <p className="font-semibold">{d.fullDate}</p>
                          <p className="text-muted-foreground">{d.displayValue}</p>
                          {d.distance && <p className="text-muted-foreground">📏 {Math.round(d.distance)} m</p>}
                          {d.avgWatts && <p className="text-warning font-medium">⚡ {Math.round(d.avgWatts)} W</p>}
                          {d.rpe && <p className="text-muted-foreground">RPE {d.rpe}/10</p>}
                          {d.isPR && <div className="mt-1"><Badge className="bg-warning/20 text-warning text-[10px] border-warning/30">🏆 PR!</Badge></div>}
                        </div>
                      );
                    }}
                  />
                  {bestValue && <ReferenceLine y={bestValue} stroke={strokeColor} strokeDasharray="4 4" strokeOpacity={0.5} />}
                  <Area
                    type="monotone" dataKey="value" stroke={strokeColor} strokeWidth={2.5}
                    fill={`url(#${gradientId})`}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (payload.isPR) {
                        return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={5} fill="hsl(var(--warning))" stroke="hsl(var(--background))" strokeWidth={2} />;
                      }
                      return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={3} fill={strokeColor} stroke="hsl(var(--background))" strokeWidth={1.5} />;
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History List */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>Záznamy</span>
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{history.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Žádné záznamy</p>
          ) : (
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto -mx-1 px-1">
              {history.map((entry, index) => {
                const entryRpe = entry.rpe;
                const entryWatts = entry.avg_watts;
                const entryHR = entry.avg_heart_rate;
                const entrySets = entry.sets;
                const isFirstEntry = index === 0;

                const rpeBorder = entryRpe
                  ? entryRpe >= 9 ? 'border-l-destructive'
                  : entryRpe >= 7 ? 'border-l-warning'
                  : 'border-l-success'
                  : 'border-l-border/30';

                const volume = isStrength && entrySets && entry.reps && entry.weight_kg
                  ? Math.round(entrySets * entry.reps * entry.weight_kg) : null;

                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "flex flex-col gap-1.5 px-3 py-2.5 rounded-lg border-l-4 transition-colors",
                      isFirstEntry
                        ? "bg-primary/5 border border-primary/20 border-l-primary"
                        : cn("bg-muted/20 border border-border/30 hover:bg-muted/40", rpeBorder)
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground tabular-nums shrink-0 w-[58px]">
                        {format(parseISO(entry.date), 'd. M. yy', { locale: cs })}
                      </span>
                      {isFirstEntry && (
                        <Badge className="text-[9px] px-1 py-0 h-4 bg-primary/15 text-primary border-primary/30 shrink-0">
                          Poslední
                        </Badge>
                      )}
                      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                        {isStrength && entrySets && entry.reps && (
                          <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                            {entrySets}×{entry.reps}
                          </span>
                        )}
                        <span className="font-bold text-sm tabular-nums">{entry.displayValue}</span>
                        {entry.distance_meters && entry.distance_meters > 0 && entry.metricType !== 'distance' && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <Ruler className="w-3 h-3 shrink-0" />
                            {Math.round(entry.distance_meters)} m
                          </span>
                        )}
                      </div>
                      {entryRpe && <RpeBadge rpe={entryRpe} />}
                    </div>

                    {(volume || (entryWatts && entryWatts > 0) || (entryHR && entryHR > 0) || entry.notes) && (
                      <div className="flex items-center gap-2 pl-[66px] flex-wrap">
                        {volume && <span className="text-[10px] text-muted-foreground">Vol: {volume.toLocaleString('cs-CZ')} kg</span>}
                        {entryWatts && entryWatts > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] text-warning font-semibold">
                            <Zap className="w-2.5 h-2.5" />{Math.round(entryWatts)} W
                          </span>
                        )}
                        {entryHR && entryHR > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Heart className="w-2.5 h-2.5" />{entryHR} bpm
                          </span>
                        )}
                        {entry.notes && (
                          <span className="text-[10px] text-muted-foreground/70 italic truncate max-w-[130px]">
                            {entry.notes.slice(0, 45)}{entry.notes.length > 45 ? '…' : ''}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
