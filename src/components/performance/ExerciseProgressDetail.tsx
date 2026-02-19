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
  TrendingUp, TrendingDown, Minus, Zap, Ruler, Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useExerciseHistory } from '@/hooks/useExerciseHistory';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts';
import { motion } from 'framer-motion';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function RpeBadge({ rpe }: { rpe: number }) {
  const color = rpe >= 9
    ? 'bg-destructive/15 text-destructive border-destructive/30'
    : rpe >= 7
    ? 'bg-warning/15 text-warning border-warning/30'
    : 'bg-success/15 text-success border-success/30';
  return (
    <span className={cn("inline-flex items-center text-[10px] font-semibold px-1.5 py-0 rounded-full border h-4", color)}>
      RPE {rpe}
    </span>
  );
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

  const isCardio = exerciseType === 'cardio';
  const isSkill = exerciseType === 'skill';
  const isStrength = exerciseType === 'strength' && !isTimeBased;

  const strokeColor = isCardio ? 'hsl(var(--success))'
    : isSkill ? 'hsl(var(--warning))'
    : 'hsl(var(--primary))';
  const gradientId = `epd-grad-${exerciseName.replace(/\s+/g, '')}`;

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
        rpe: entry.rpe,
        avg_watts: entry.avg_watts,
        distance: entry.distance_meters,
      };
    });
  }, [history, isTimeBased]);

  // Stats
  const stats = useMemo(() => {
    if (chartData.length < 2) return { maxValue: 0, trend: 0, trendPositive: false };
    const values = chartData.map(d => d.value).filter(v => v > 0);
    const maxValue = isTimeBased ? Math.min(...values) : Math.max(...values);
    const first = chartData[0].value;
    const last = chartData[chartData.length - 1].value;
    const trend = last - first;
    const trendPositive = isTimeBased ? trend < 0 : trend > 0;
    return { maxValue, trend, trendPositive };
  }, [chartData, isTimeBased]);

  const TrendIcon = stats.trendPositive ? TrendingUp : stats.trend !== 0 ? TrendingDown : Minus;
  const trendColor = stats.trendPositive ? 'text-success' : stats.trend !== 0 ? 'text-destructive' : 'text-muted-foreground';

  const getIcon = () => {
    if (isCardio) return <Heart className="w-5 h-5 text-success" />;
    if (isSkill) return <Zap className="w-5 h-5 text-warning" />;
    return <Dumbbell className="w-5 h-5 text-primary" />;
  };
  const getIconBg = () => {
    if (isCardio) return 'bg-success/10';
    if (isSkill) return 'bg-warning/10';
    return 'bg-primary/10';
  };
  const typeLabel = isCardio ? 'Kardio' : isSkill ? 'Skill / Plyo' : 'Síla';
  const typeBadgeClass = isCardio ? 'border-success/30 text-success bg-success/10'
    : isSkill ? 'border-warning/30 text-warning bg-warning/10'
    : 'border-primary/30 text-primary bg-primary/10';

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
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm", getIconBg())}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{exerciseName}</h3>
            <Badge variant="outline" className={cn("text-[10px] shrink-0 h-5 px-1.5", typeBadgeClass)}>
              {typeLabel}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{clientName}</p>
        </div>
      </div>

      {/* Stats Row */}
      {!isLoading && chartData.length >= 2 && (
        <div className="grid grid-cols-3 gap-2">
          <div className={cn("rounded-xl p-3 border", getIconBg(), "border-border/40")}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Target className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {isTimeBased ? 'Nejlepší' : 'Max váha'}
              </span>
            </div>
            <p className="text-xl font-bold tabular-nums">
              {isTimeBased ? formatTime(stats.maxValue) : `${stats.maxValue} kg`}
            </p>
          </div>
          <div className="rounded-xl p-3 border bg-card border-border/40">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Záznamy</span>
            </div>
            <p className="text-xl font-bold tabular-nums">{history.length}</p>
          </div>
          <div className="rounded-xl p-3 border bg-card border-border/40">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendIcon className={cn("w-3.5 h-3.5", trendColor)} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Trend</span>
            </div>
            <p className={cn("text-xl font-bold tabular-nums", trendColor)}>
              {stats.trend > 0 ? '+' : ''}
              {isTimeBased ? `${Math.abs(Math.round(stats.trend))}s` : `${Math.abs(stats.trend).toFixed(1)} kg`}
            </p>
          </div>
        </div>
      )}

      {/* Progress Chart – Area fill */}
      {isLoading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : chartData.length > 1 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              Progrese
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={strokeColor} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
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
                        <div className="bg-popover border rounded-lg p-2.5 shadow-lg text-xs space-y-0.5">
                          <p className="font-semibold">{data.fullDate}</p>
                          <p className="text-muted-foreground">
                            {data.displayValue}
                            {!isTimeBased && data.reps ? ` × ${data.reps}` : ''}
                          </p>
                          {data.distance && (
                            <p className="text-muted-foreground">📏 {Math.round(data.distance)} m</p>
                          )}
                          {data.avg_watts && (
                            <p className="text-warning font-medium">⚡ {Math.round(data.avg_watts)} W</p>
                          )}
                          {data.rpe && (
                            <p className="text-muted-foreground">RPE {data.rpe}/10</p>
                          )}
                        </div>
                      );
                    }}
                  />
                  {stats.maxValue > 0 && (
                    <ReferenceLine
                      y={stats.maxValue}
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
                      const { cx, cy } = props;
                      return (
                        <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={3}
                          fill={strokeColor} stroke="hsl(var(--background))" strokeWidth={1.5}
                        />
                      );
                    }}
                    activeDot={{ r: 5, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Potřeba alespoň 2 záznamy pro zobrazení grafu
        </div>
      )}

      {/* History List – mini-karty s RPE border kódováním */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>Historie záznamů</span>
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
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto -mx-1 px-1">
              {history.map((entry, index) => {
                const entryRpe = entry.rpe;
                const entryWatts = entry.avg_watts;
                const entryHR = entry.avg_heart_rate;
                const entrySets = entry.sets;
                const isFirst = index === 0;

                // RPE → border barva
                const rpeBorder = entryRpe
                  ? entryRpe >= 9 ? 'border-l-destructive'
                  : entryRpe >= 7 ? 'border-l-warning'
                  : 'border-l-success'
                  : 'border-l-border/30';

                const volume = isStrength && entrySets && entry.reps && entry.weight_kg
                  ? Math.round(entrySets * entry.reps * entry.weight_kg)
                  : null;

                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "flex flex-col gap-1.5 px-3 py-2.5 rounded-lg border-l-4 transition-colors",
                      isFirst
                        ? "bg-primary/5 border border-primary/20 border-l-primary"
                        : cn("bg-muted/20 border border-border/30 hover:bg-muted/40", rpeBorder)
                    )}
                  >
                    {/* Horní řádek */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground tabular-nums shrink-0 w-[60px]">
                        {format(parseISO(entry.date), 'd. M. yy', { locale: cs })}
                      </span>

                      {isFirst && (
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

                    {/* Dolní řádek: doplňkové metriky */}
                    {(volume || (entryWatts && entryWatts > 0) || (entryHR && entryHR > 0) || entry.notes) && (
                      <div className="flex items-center gap-2 pl-[68px] flex-wrap">
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
                          <span className="text-[10px] text-muted-foreground/70 italic truncate max-w-[140px]">
                            {entry.notes.slice(0, 50)}{entry.notes.length > 50 ? '…' : ''}
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
