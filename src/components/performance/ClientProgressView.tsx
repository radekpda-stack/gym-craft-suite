/**
 * ClientProgressView - Training journal view for clients
 * Redesigned as a journal-first experience: client list → exercise list → detail
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, ExternalLink, BarChart2, Trophy, Plus,
  Dumbbell, Heart, Zap, ArrowLeft, Search,
  ChevronRight, TrendingUp, TrendingDown, Minus,
  Timer, Ruler, Activity, Calendar, Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiClientComparison } from './MultiClientComparison';
import { CohortBenchmarkView } from './CohortBenchmarkView';
import { QuickLogDialog } from '@/components/exercises/QuickLogDialog';
import { useAllClientsProgress } from '@/hooks/useClientProgressStats';
import { useClients } from '@/hooks/useClients';
import { useClientAllExercises, type ClientExerciseProgress } from '@/hooks/useClientAllExercises';
import { useExerciseHistory } from '@/hooks/useExerciseHistory';
import { cn } from '@/lib/utils';
import { getRpeBgColor } from '@/lib/exerciseMetrics';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

// ─── RPE Badge ───────────────────────────────────────────────────────────────

function RpeBadge({ rpe }: { rpe: number }) {
  return (
    <Badge className={cn("text-[10px] px-1.5 py-0 h-4 shrink-0", getRpeBgColor(rpe))}>
      RPE {rpe}
    </Badge>
  );
}

// ─── Exercise List Item ───────────────────────────────────────────────────────

interface ExerciseListItemProps {
  exercise: ClientExerciseProgress;
  onClick: () => void;
}

function ExerciseListItem({ exercise, onClick }: ExerciseListItemProps) {
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

  // Trend
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

  // Primary metric
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
      {/* Top row: icon + name + date + trend + chevron */}
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

      {/* Bottom row: key metrics */}
      <div className="flex items-center gap-3 pl-[52px] flex-wrap">
        {/* Time-based primary */}
        {primaryTime && (
          <div className="flex items-center gap-1">
            <Timer className="w-3.5 h-3.5 text-muted-foreground/60" />
            <span className="font-bold text-base tabular-nums">{primaryTime}</span>
          </div>
        )}

        {/* Weight-based primary */}
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

        {/* Distance */}
        {distanceStr && (
          <div className="flex items-center gap-1">
            <Ruler className="w-3.5 h-3.5 text-muted-foreground/60" />
            <span className="text-sm font-semibold tabular-nums">{distanceStr}</span>
          </div>
        )}

        {/* Watts */}
        {latestWatts && latestWatts > 0 && (
          <div className="flex items-center gap-0.5">
            <Zap className="w-3.5 h-3.5 text-warning" />
            <span className="text-sm font-semibold tabular-nums text-warning">{Math.round(latestWatts)} W</span>
          </div>
        )}

        {/* Heart rate */}
        {latestHR && latestHR > 0 && (
          <div className="flex items-center gap-0.5">
            <Heart className="w-3.5 h-3.5 text-muted-foreground/60" />
            <span className="text-sm tabular-nums">{latestHR}</span>
          </div>
        )}

        {/* RPE */}
        {latestRpe && <RpeBadge rpe={latestRpe} />}
      </div>
    </motion.button>
  );
}

// ─── Exercise Detail View ─────────────────────────────────────────────────────

interface ExerciseDetailViewProps {
  clientId: string;
  clientName: string;
  exercise: ClientExerciseProgress;
  onBack: () => void;
  onQuickLog: (exerciseName?: string) => void;
}

function ExerciseDetailView({ clientId, clientName, exercise, onBack, onQuickLog }: ExerciseDetailViewProps) {
  const { data: history = [], isLoading } = useExerciseHistory(
    clientId,
    exercise.exerciseName,
    null,
    null
  );

  const { exerciseType } = exercise;
  const isCardio = exerciseType === 'cardio';
  const isSkill = exerciseType === 'skill';
  const isStrength = exerciseType === 'strength' && !exercise.isTimeBased;

  // Chart data – chronological order
  const chartData = useMemo(() => {
    return [...exercise.data].map(d => ({
      date: format(parseISO(d.date), 'd.M.', { locale: cs }),
      fullDate: format(parseISO(d.date), 'd. MMMM yyyy', { locale: cs }),
      value: exercise.isTimeBased ? d.timeSeconds : d.weight,
      distance: d.distanceMeters,
      rpe: d.rpe,
      displayValue: exercise.isTimeBased && d.timeSeconds
        ? formatTime(d.timeSeconds)
        : d.weight
        ? `${d.weight} kg`
        : d.distanceMeters
        ? `${Math.round(d.distanceMeters)} m`
        : '-',
      reps: d.reps,
      isPR: d.isPR,
      avgWatts: d.avgWatts,
    }));
  }, [exercise.data, exercise.isTimeBased]);

  // Trend
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

  const typeIcon = isCardio
    ? <Heart className="w-4 h-4 text-success" />
    : isSkill
    ? <Zap className="w-4 h-4 text-warning" />
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
        <Button
          size="sm"
          className="shrink-0 gap-1.5 h-8"
          onClick={() => onQuickLog(exercise.exerciseName)}
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Přidat</span>
        </Button>
      </div>

      {/* KPI Cards – 2×2 grid, bold values */}
      <div className="grid grid-cols-2 gap-2">
        <div className={cn("rounded-xl p-3 border", typeBg, "border-border/40")}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Target className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
              {isStrength ? 'Max váha' : isCardio ? 'Nejlepší čas' : 'Záznamů'}
            </span>
          </div>
          <p className="text-2xl font-bold tabular-nums">
            {isStrength && exercise.maxWeight
              ? `${exercise.maxWeight} kg`
              : exercise.bestTime
              ? formatTime(exercise.bestTime)
              : exercise.count}
          </p>
        </div>

        {isCardio && exercise.bestDistance ? (
          <div className="rounded-xl p-3 border bg-success/5 border-border/40">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Ruler className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Vzdálenost</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {exercise.bestDistance >= 1000
                ? `${(exercise.bestDistance / 1000).toFixed(1)} km`
                : `${Math.round(exercise.bestDistance)} m`}
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

      {/* Progress Chart – area fill s gradientem */}
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
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
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
                          {d.distance && (
                            <p className="text-muted-foreground">📏 {Math.round(d.distance)} m</p>
                          )}
                          {d.avgWatts && (
                            <p className="text-warning font-medium">⚡ {Math.round(d.avgWatts)} W</p>
                          )}
                          {d.rpe && (
                            <p className="text-muted-foreground">RPE {d.rpe}/10</p>
                          )}
                          {d.isPR && (
                            <div className="mt-1"><Badge className="bg-warning/20 text-warning text-[10px] border-warning/30">🏆 PR!</Badge></div>
                          )}
                        </div>
                      );
                    }}
                  />
                  {bestValue && (
                    <ReferenceLine
                      y={bestValue}
                      stroke={strokeColor}
                      strokeDasharray="4 4"
                      strokeOpacity={0.5}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={strokeColor}
                    strokeWidth={2.5}
                    fill={`url(#${gradientId})`}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (payload.isPR) {
                        return (
                          <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={5}
                            fill="hsl(var(--warning))" stroke="hsl(var(--background))" strokeWidth={2}
                          />
                        );
                      }
                      return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={3}
                        fill={strokeColor} stroke="hsl(var(--background))" strokeWidth={1.5}
                      />;
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History List – mini-karty s RPE border kódováním */}
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

                // RPE → border barva
                const rpeBorder = entryRpe
                  ? entryRpe >= 9 ? 'border-l-destructive'
                  : entryRpe >= 7 ? 'border-l-warning'
                  : 'border-l-success'
                  : 'border-l-border/30';

                // Objem pro sílu
                const volume = isStrength && entrySets && entry.reps && entry.weight_kg
                  ? Math.round(entrySets * entry.reps * entry.weight_kg)
                  : null;

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
                    {/* Horní řádek: datum + badge + hlavní hodnota */}
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
                        {/* Síla: sériová struktura */}
                        {isStrength && entrySets && entry.reps && (
                          <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                            {entrySets}×{entry.reps}
                          </span>
                        )}
                        <span className="font-bold text-sm tabular-nums">{entry.displayValue}</span>

                        {/* Kardio: vzdálenost */}
                        {entry.distance_meters && entry.distance_meters > 0 && entry.metricType !== 'distance' && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <Ruler className="w-3 h-3 shrink-0" />
                            {Math.round(entry.distance_meters)} m
                          </span>
                        )}
                      </div>

                      {entryRpe && <RpeBadge rpe={entryRpe} />}
                    </div>

                    {/* Dolní řádek: objem / watty / tep / poznámka */}
                    {(volume || (entryWatts && entryWatts > 0) || (entryHR && entryHR > 0) || entry.notes) && (
                      <div className="flex items-center gap-2 pl-[66px] flex-wrap">
                        {volume && (
                          <span className="text-[10px] text-muted-foreground">
                            Vol: {volume.toLocaleString('cs-CZ')} kg
                          </span>
                        )}
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

// ─── Journal View (client selected) ──────────────────────────────────────────

type ExerciseFilter = 'all' | 'strength' | 'cardio' | 'skill';

interface JournalViewProps {
  clientId: string;
  clientName: string;
  onBack: () => void;
  onNavigateToClient: () => void;
  onQuickLog: () => void;
}

function JournalView({ clientId, clientName, onBack, onNavigateToClient, onQuickLog }: JournalViewProps) {
  const [filter, setFilter] = useState<ExerciseFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<ClientExerciseProgress | null>(null);
  const [quickLogExerciseName, setQuickLogExerciseName] = useState<string | undefined>();

  const { data: exercises = [], isLoading } = useClientAllExercises(clientId, 24);

  const filtered = useMemo(() => {
    let list = exercises;
    if (filter !== 'all') {
      list = list.filter(e => e.exerciseType === filter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e => e.exerciseName.toLowerCase().includes(q));
    }
    return list;
  }, [exercises, filter, search]);

  const strengthCount = exercises.filter(e => e.exerciseType === 'strength').length;
  const cardioCount = exercises.filter(e => e.exerciseType === 'cardio').length;
  const skillCount = exercises.filter(e => e.exerciseType === 'skill').length;

  const handleQuickLog = (exerciseName?: string) => {
    setQuickLogExerciseName(exerciseName);
    onQuickLog();
  };

  if (selectedExercise) {
    return (
      <ExerciseDetailView
        clientId={clientId}
        clientName={clientName}
        exercise={selectedExercise}
        onBack={() => setSelectedExercise(null)}
        onQuickLog={handleQuickLog}
      />
    );
  }

  return (
    <motion.div
      key="journal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Client bar */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-9 w-9">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{clientName}</p>
          <p className="text-xs text-muted-foreground">
            {exercises.length} cviků · {exercises.reduce((s, e) => s + e.count, 0)} záznamů
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onNavigateToClient} className="shrink-0 gap-1 h-8">
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs">Karta</span>
        </Button>
        <Button size="sm" onClick={() => handleQuickLog()} className="shrink-0 gap-1 h-8">
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs">Zapsat</span>
        </Button>
      </div>

      {/* Type filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {([
          ['all', 'Vše', null],
          ['strength', 'Síla', strengthCount],
          ['cardio', 'Kardio', cardioCount],
          ['skill', 'Plyo', skillCount],
        ] as const).map(([value, label, count]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all",
              filter === value
                ? value === 'all'
                  ? 'bg-foreground text-background'
                  : value === 'cardio'
                  ? 'bg-success text-white'
                  : value === 'skill'
                  ? 'bg-warning text-black'
                  : 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {value === 'strength' && <Dumbbell className="w-3 h-3" />}
            {value === 'cardio' && <Heart className="w-3 h-3" />}
            {value === 'skill' && <Zap className="w-3 h-3" />}
            {label}
            {count !== null && count > 0 && (
              <span className="opacity-70 text-[10px]">({count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Hledat cvik..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Exercise list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-muted-foreground gap-3">
          <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center">
            <Dumbbell className="w-7 h-7 opacity-40" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">
              {exercises.length === 0 ? 'Zatím žádné záznamy' : 'Žádné výsledky'}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              {exercises.length === 0
                ? 'Zapište první výkon pomocí tlačítka + Zapsat'
                : 'Zkuste jiný filtr nebo hledaný výraz'}
            </p>
          </div>
          {exercises.length === 0 && (
            <button
              onClick={() => onQuickLog()}
              className="text-xs font-semibold text-primary underline underline-offset-2"
            >
              + Zapsat první výkon
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(exercise => (
            <ExerciseListItem
              key={exercise.exerciseName}
              exercise={exercise}
              onClick={() => setSelectedExercise(exercise)}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Client List ──────────────────────────────────────────────────────────────

interface ClientListProps {
  onSelectClient: (id: string, name: string) => void;
}

function getActivityStatus(lastActivity: string | null): {
  dot: string;
  badgeClass: string;
  label: string;
} {
  if (!lastActivity) return { dot: 'bg-muted-foreground/30', badgeClass: 'border-border/40 text-muted-foreground', label: 'Bez záznamu' };
  const days = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 7) return { dot: 'bg-success', badgeClass: 'border-success/40 text-success bg-success/10', label: formatDistanceToNow(parseISO(lastActivity), { addSuffix: true, locale: cs }) };
  if (days <= 30) return { dot: 'bg-warning', badgeClass: 'border-warning/40 text-warning bg-warning/10', label: formatDistanceToNow(parseISO(lastActivity), { addSuffix: true, locale: cs }) };
  return { dot: 'bg-destructive', badgeClass: 'border-destructive/40 text-destructive bg-destructive/10', label: formatDistanceToNow(parseISO(lastActivity), { addSuffix: true, locale: cs }) };
}

function ClientList({ onSelectClient }: ClientListProps) {
  const [search, setSearch] = useState('');
  const { data: allClients = [], isLoading } = useAllClientsProgress();

  const filtered = allClients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Input
        placeholder="Hledat klienta..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Žádní klienti</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(client => {
            const activity = getActivityStatus(client.lastActivity || null);
            return (
              <button
                key={client.id}
                onClick={() => onSelectClient(client.id, client.name)}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-xl text-left',
                  'bg-card/80 border border-border/50',
                  'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-primary/30'
                )}
              >
                {/* Avatar with activity dot */}
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">
                      {client.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
                    activity.dot
                  )} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{client.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {client.entriesCount} záznamů
                    </span>
                    {client.lastActivity && (
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] h-4 px-1.5 border shrink-0", activity.badgeClass)}
                      >
                        {activity.label}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {client.prCount > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium">
                      <Trophy className="w-3 h-3" />
                      {client.prCount}
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ClientProgressViewProps {
  initialClientId?: string;
}

export function ClientProgressView({ initialClientId }: ClientProgressViewProps) {
  const navigate = useNavigate();
  const { data: clients = [] } = useClients();

  const [viewMode, setViewMode] = useState<'single' | 'compare' | 'benchmark'>('single');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(initialClientId || null);
  const [selectedClientName, setSelectedClientName] = useState<string>(() => {
    if (!initialClientId) return '';
    return clients.find(c => c.id === initialClientId)?.name || '';
  });
  const [showQuickLog, setShowQuickLog] = useState(false);

  const handleSelectClient = (id: string, name: string) => {
    setSelectedClientId(id);
    setSelectedClientName(name);
  };

  const handleBack = () => {
    setSelectedClientId(null);
    setSelectedClientName('');
  };

  return (
    <div className="space-y-6">
      {/* Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
        <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3 bg-secondary/30 backdrop-blur-sm">
          <TabsTrigger value="single" className="gap-2 text-xs">
            <Users className="w-3.5 h-3.5" />
            Deník
          </TabsTrigger>
          <TabsTrigger value="compare" className="gap-2 text-xs">
            <BarChart2 className="w-3.5 h-3.5" />
            Porovnání
          </TabsTrigger>
          <TabsTrigger value="benchmark" className="gap-2 text-xs">
            <Trophy className="w-3.5 h-3.5" />
            Benchmark
          </TabsTrigger>
        </TabsList>

        {/* Journal Tab */}
        <TabsContent value="single" className="mt-6">
          <AnimatePresence mode="wait">
            {selectedClientId ? (
              <JournalView
                key={selectedClientId}
                clientId={selectedClientId}
                clientName={selectedClientName}
                onBack={handleBack}
                onNavigateToClient={() => navigate(`/clients/${selectedClientId}`)}
                onQuickLog={() => setShowQuickLog(true)}
              />
            ) : (
              <motion.div key="client-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <ClientList onSelectClient={handleSelectClient} />
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="compare" className="mt-6">
          <MultiClientComparison />
        </TabsContent>

        {/* Benchmark Tab */}
        <TabsContent value="benchmark" className="mt-6">
          <CohortBenchmarkView />
        </TabsContent>
      </Tabs>

      {/* Quick Log Dialog – pre-filled with selected client */}
      <QuickLogDialog
        open={showQuickLog}
        onOpenChange={setShowQuickLog}
        clientId={selectedClientId}
      />
    </div>
  );
}
