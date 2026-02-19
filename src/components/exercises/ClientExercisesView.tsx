import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  User, Search, Dumbbell, Heart, Clock, TrendingUp, TrendingDown, 
  Minus, ChevronRight, Trophy, ArrowLeft, Calendar, Target, Zap,
  Timer, Ruler, Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientSearchSelect } from '@/components/ui/client-search-select';
import { useClients } from '@/hooks/useClients';
import { useClientAllExercises, type ClientExerciseProgress } from '@/hooks/useClientAllExercises';
import { useExerciseHistory } from '@/hooks/useExerciseHistory';
import { cn } from '@/lib/utils';
import { getRpeBgColor } from '@/lib/exerciseMetrics';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

// ─── Exercise List Item ───────────────────────────────────────────────────────

interface ExerciseListItemProps {
  exercise: ClientExerciseProgress;
  onClick: () => void;
}

function ExerciseListItem({ exercise, onClick }: ExerciseListItemProps) {
  const { exerciseType } = exercise;
  
  const iconBg = exerciseType === 'cardio' ? 'bg-success/10' 
    : exerciseType === 'skill' ? 'bg-warning/10' 
    : 'bg-primary/10';

  const icon = exerciseType === 'cardio' 
    ? <Heart className="w-4 h-4 text-success" />
    : exerciseType === 'skill' 
    ? <Zap className="w-4 h-4 text-warning" />
    : <Dumbbell className="w-4 h-4 text-primary" />;

  // Primary display value
  const primaryValue = exerciseType === 'cardio' || exercise.isTimeBased
    ? exercise.bestTime ? formatTime(exercise.bestTime) : null
    : exercise.maxWeight ? `${exercise.maxWeight} kg` : null;

  // Secondary metric (distance or rpe)
  const secondaryValue = exercise.bestDistance
    ? `${Math.round(exercise.bestDistance)} m`
    : exercise.avgRpe
    ? `RPE ${exercise.avgRpe}`
    : null;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border hover:bg-muted/50 active:bg-muted/70 transition-colors text-left min-h-[64px]"
    >
      {/* Icon */}
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", iconBg)}>
        {icon}
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm leading-tight truncate">{exercise.exerciseName}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-xs text-muted-foreground">{exercise.count}×</span>
          {exercise.prCount > 0 && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-500/30">
              {exercise.prCount} PR
            </Badge>
          )}
          {exercise.avgRpe && exerciseType !== 'skill' && (
            <Badge className={cn("text-[10px] px-1 py-0 h-4", getRpeBgColor(Math.round(exercise.avgRpe)))}>
              RPE {exercise.avgRpe}
            </Badge>
          )}
        </div>
      </div>

      {/* Right side values */}
      <div className="text-right shrink-0 ml-1">
        {primaryValue && (
          <p className="font-semibold tabular-nums text-sm">{primaryValue}</p>
        )}
        {secondaryValue && exercise.bestDistance && (
          <p className="text-xs text-muted-foreground tabular-nums">{secondaryValue}</p>
        )}
        <p className="text-[11px] text-muted-foreground">
          {format(parseISO(exercise.lastDate), 'd.M.yy', { locale: cs })}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}

// ─── Exercise Detail View ─────────────────────────────────────────────────────

interface ExerciseDetailViewProps {
  clientId: string;
  clientName: string;
  exercise: ClientExerciseProgress;
  onBack: () => void;
}

function ExerciseDetailView({ clientId, clientName, exercise, onBack }: ExerciseDetailViewProps) {
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

  // Prepare chart data
  const chartData = useMemo(() => {
    return exercise.data.map(d => ({
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

  // Icon + color for type
  const typeIcon = isCardio
    ? <Heart className="w-5 h-5 text-success" />
    : isSkill
    ? <Zap className="w-5 h-5 text-warning" />
    : <Dumbbell className="w-5 h-5 text-primary" />;

  const typeBg = isCardio ? 'bg-success/10' : isSkill ? 'bg-warning/10' : 'bg-primary/10';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-9 w-9">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", typeBg)}>
          {typeIcon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base leading-tight truncate">{exercise.exerciseName}</h3>
          <p className="text-xs text-muted-foreground">{clientName}</p>
        </div>
        <Badge variant="outline" className="shrink-0 text-xs">
          {isCardio ? 'Kardio' : isSkill ? 'Skill / Plyo' : 'Síla'}
        </Badge>
      </div>

      {/* KPI Stats – type-specific */}
      <div className="grid grid-cols-2 gap-2">
        {/* Primary metric */}
        <Card className="p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            {isStrength ? <Trophy className="w-3.5 h-3.5 text-primary" /> : <Timer className="w-3.5 h-3.5 text-primary" />}
            <span className="text-xs">{isStrength ? 'Max váha' : 'Nejlepší čas'}</span>
          </div>
          <p className="text-xl font-bold tabular-nums">
            {isStrength && exercise.maxWeight
              ? `${exercise.maxWeight} kg`
              : exercise.bestTime
              ? formatTime(exercise.bestTime)
              : '–'}
          </p>
        </Card>

        {/* Cardio: best distance / Strength: PR count / Skill: PR count */}
        {isCardio && exercise.bestDistance ? (
          <Card className="p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Ruler className="w-3.5 h-3.5 text-success" />
              <span className="text-xs">Nejlepší dist.</span>
            </div>
            <p className="text-xl font-bold tabular-nums">
              {exercise.bestDistance >= 1000
                ? `${(exercise.bestDistance / 1000).toFixed(1)} km`
                : `${Math.round(exercise.bestDistance)} m`}
            </p>
          </Card>
        ) : (
          <Card className="p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Trophy className="w-3.5 h-3.5 text-warning" />
              <span className="text-xs">Počet PR</span>
            </div>
            <p className="text-xl font-bold tabular-nums">{exercise.prCount}</p>
          </Card>
        )}

        {/* Trend */}
        <Card className="p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <TrendIcon className={cn("w-3.5 h-3.5", trendColor)} />
            <span className="text-xs">Trend</span>
          </div>
          <p className={cn("text-xl font-bold tabular-nums", trendColor)}>
            {trend.change === 0 ? '—'
              : exercise.isTimeBased
              ? `${trend.change > 0 ? '+' : ''}${Math.round(Math.abs(trend.change))}s`
              : `${trend.change > 0 ? '+' : ''}${Math.abs(trend.change).toFixed(1)} kg`}
          </p>
        </Card>

        {/* RPE avg or record count */}
        {exercise.avgRpe ? (
          <Card className="p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Activity className="w-3.5 h-3.5" />
              <span className="text-xs">Průměr RPE</span>
            </div>
            <p className="text-xl font-bold tabular-nums">{exercise.avgRpe}</p>
            <p className="text-[10px] text-muted-foreground">z 10</p>
          </Card>
        ) : (
          <Card className="p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Calendar className="w-3.5 h-3.5" />
              <span className="text-xs">Záznamy</span>
            </div>
            <p className="text-xl font-bold tabular-nums">{exercise.count}</p>
          </Card>
        )}
      </div>

      {/* Progress Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm">Progrese</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
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
                    reversed={false}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-popover border rounded-lg p-2 shadow-lg text-xs max-w-[150px]">
                          <p className="font-medium">{d.fullDate}</p>
                          <p className="text-muted-foreground">{d.displayValue}</p>
                          {d.distance && (
                            <p className="text-muted-foreground">{Math.round(d.distance)} m</p>
                          )}
                          {d.rpe && (
                            <p className="text-muted-foreground">RPE {d.rpe}/10</p>
                          )}
                          {d.isPR && (
                            <Badge className="mt-1 bg-amber-500/20 text-amber-600 text-[10px]">PR!</Badge>
                          )}
                        </div>
                      );
                    }}
                  />
                  {bestValue && (
                    <ReferenceLine 
                      y={bestValue} 
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
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (payload.isPR) {
                        return (
                          <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={5}
                            fill="hsl(var(--warning))" stroke="hsl(var(--background))" strokeWidth={2}
                          />
                        );
                      }
                      return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={3} fill="hsl(var(--primary))" />;
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History List */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Záznamy ({history.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Žádné záznamy</p>
          ) : (
            <div className="space-y-0.5 max-h-[280px] overflow-y-auto -mx-1">
              {history.map((entry, index) => (
                <div 
                  key={entry.id}
                  className={cn(
                    "flex items-center justify-between px-2 py-2 rounded-lg",
                    index === 0 ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0 w-14">
                      {format(parseISO(entry.date), 'd.M.yy', { locale: cs })}
                    </span>
                    <span className="font-medium text-sm tabular-nums truncate">{entry.displayValue}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {(entry as any).rpe && (
                      <Badge className={cn("text-[10px] px-1 py-0 h-4", getRpeBgColor((entry as any).rpe))}>
                        {(entry as any).rpe}
                      </Badge>
                    )}
                    {index === 0 && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-primary/10 text-primary border-primary/30">
                        Poslední
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function ClientExercisesView() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<ClientExerciseProgress | null>(null);

  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: exercises = [], isLoading: exercisesLoading } = useClientAllExercises(selectedClientId, 24);

  const selectedClient = useMemo(() => 
    clients.find(c => c.id === selectedClientId),
    [clients, selectedClientId]
  );

  // Filter exercises by search
  const filteredExercises = useMemo(() => {
    if (!searchQuery) return exercises;
    const query = searchQuery.toLowerCase();
    return exercises.filter(e => e.exerciseName.toLowerCase().includes(query));
  }, [exercises, searchQuery]);

  // Separate by exercise type
  const strengthExercises = filteredExercises.filter(e => e.exerciseType === 'strength');
  const cardioExercises = filteredExercises.filter(e => e.exerciseType === 'cardio');
  const skillExercises = filteredExercises.filter(e => e.exerciseType === 'skill');

  const handleClientChange = (value: string) => {
    setSelectedClientId(value || null);
    setSelectedExercise(null);
    setSearchQuery('');
  };

  return (
    <div className="space-y-4">
      {/* Client Search */}
      {!selectedExercise && (
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3 -mx-4 px-4 border-b">
          <div className="flex flex-col sm:flex-row gap-2">
            <ClientSearchSelect
              clients={clients}
              value={selectedClientId || ''}
              onValueChange={handleClientChange}
              placeholder="Vyberte klienta..."
              filterArchived
              className="w-full sm:w-[240px]"
            />
            {selectedClientId && (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Hledat cvik..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {selectedExercise && selectedClient ? (
          <ExerciseDetailView
            key="detail"
            clientId={selectedClientId!}
            clientName={selectedClient.name || `${selectedClient.first_name} ${selectedClient.last_name}`}
            exercise={selectedExercise}
            onBack={() => setSelectedExercise(null)}
          />
        ) : !selectedClientId ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">Vyberte klienta</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Vyhledejte klienta pro zobrazení jeho cvičební historie a výkonnosti
            </p>
          </motion.div>
        ) : exercisesLoading ? (
          <motion.div key="loading" className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </motion.div>
        ) : exercises.length === 0 ? (
          <motion.div
            key="no-data"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
              <Dumbbell className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">Žádné záznamy</h3>
            <p className="text-sm text-muted-foreground">
              {selectedClient?.name || 'Klient'} zatím nemá žádné zapsané cviky
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-5"
          >
            {/* Client Header */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-base font-bold text-primary">
                  {selectedClient?.first_name?.charAt(0) || selectedClient?.name?.charAt(0) || '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">
                  {selectedClient?.name || `${selectedClient?.first_name} ${selectedClient?.last_name}`}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {exercises.length} cviků • {exercises.reduce((s, e) => s + e.count, 0)} záznamů
                </p>
              </div>
              {/* Type badges summary */}
              <div className="flex gap-1 shrink-0">
                {strengthExercises.length > 0 && (
                  <div className="flex items-center gap-1 bg-primary/10 rounded-md px-1.5 py-0.5">
                    <Dumbbell className="w-3 h-3 text-primary" />
                    <span className="text-xs font-medium text-primary">{strengthExercises.length}</span>
                  </div>
                )}
                {cardioExercises.length > 0 && (
                  <div className="flex items-center gap-1 bg-success/10 rounded-md px-1.5 py-0.5">
                    <Heart className="w-3 h-3 text-success" />
                    <span className="text-xs font-medium text-success">{cardioExercises.length}</span>
                  </div>
                )}
                {skillExercises.length > 0 && (
                  <div className="flex items-center gap-1 bg-warning/10 rounded-md px-1.5 py-0.5">
                    <Zap className="w-3 h-3 text-warning" />
                    <span className="text-xs font-medium text-warning">{skillExercises.length}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Strength Exercises */}
            {strengthExercises.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Dumbbell className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-semibold">Síla</h4>
                  <span className="text-xs text-muted-foreground">({strengthExercises.length})</span>
                </div>
                <div className="space-y-2">
                  {strengthExercises.map(exercise => (
                    <ExerciseListItem
                      key={exercise.exerciseName}
                      exercise={exercise}
                      onClick={() => setSelectedExercise(exercise)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Cardio Exercises */}
            {cardioExercises.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Heart className="w-4 h-4 text-success" />
                  <h4 className="text-sm font-semibold">Kardio</h4>
                  <span className="text-xs text-muted-foreground">({cardioExercises.length})</span>
                </div>
                <div className="space-y-2">
                  {cardioExercises.map(exercise => (
                    <ExerciseListItem
                      key={exercise.exerciseName}
                      exercise={exercise}
                      onClick={() => setSelectedExercise(exercise)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Skill/Plyo Exercises */}
            {skillExercises.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Zap className="w-4 h-4 text-warning" />
                  <h4 className="text-sm font-semibold">Skill / Plyo</h4>
                  <span className="text-xs text-muted-foreground">({skillExercises.length})</span>
                </div>
                <div className="space-y-2">
                  {skillExercises.map(exercise => (
                    <ExerciseListItem
                      key={exercise.exerciseName}
                      exercise={exercise}
                      onClick={() => setSelectedExercise(exercise)}
                    />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
