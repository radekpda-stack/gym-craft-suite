import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  User, Search, Dumbbell, Heart, Clock, TrendingUp, TrendingDown, 
  Minus, ChevronRight, Trophy, ArrowLeft, Calendar, Target
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

// Format seconds to mm:ss
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

interface ExerciseListItemProps {
  exercise: ClientExerciseProgress;
  onClick: () => void;
}

function ExerciseListItem({ exercise, onClick }: ExerciseListItemProps) {
  const isTimeBased = exercise.isTimeBased;
  
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border hover:bg-muted/50 transition-colors text-left"
    >
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
        isTimeBased ? "bg-success/10" : "bg-primary/10"
      )}>
        {isTimeBased ? (
          <Heart className="w-5 h-5 text-success" />
        ) : (
          <Dumbbell className="w-5 h-5 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{exercise.exerciseName}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span>{exercise.count}× záznamů</span>
          {exercise.prCount > 0 && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-500/30">
              {exercise.prCount} PR
            </Badge>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        {isTimeBased && exercise.bestTime ? (
          <p className="font-semibold tabular-nums">{formatTime(exercise.bestTime)}</p>
        ) : exercise.maxWeight ? (
          <p className="font-semibold tabular-nums">{exercise.maxWeight} kg</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {format(parseISO(exercise.lastDate), 'd. M. yyyy', { locale: cs })}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}

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

  const isTimeBased = exercise.isTimeBased;

  // Prepare chart data
  const chartData = useMemo(() => {
    return exercise.data.map(d => ({
      date: format(parseISO(d.date), 'd. M.', { locale: cs }),
      fullDate: format(parseISO(d.date), 'd. MMMM yyyy', { locale: cs }),
      value: isTimeBased ? d.timeSeconds : d.weight,
      displayValue: isTimeBased && d.timeSeconds ? formatTime(d.timeSeconds) : d.weight ? `${d.weight} kg` : '-',
      reps: d.reps,
      isPR: d.isPR,
    }));
  }, [exercise.data, isTimeBased]);

  // Calculate trend
  const trend = useMemo(() => {
    if (chartData.length < 2) return { change: 0, positive: false };
    const first = chartData[0].value || 0;
    const last = chartData[chartData.length - 1].value || 0;
    const change = last - first;
    // For time-based: lower is better (negative change = improvement)
    const positive = isTimeBased ? change < 0 : change > 0;
    return { change, positive };
  }, [chartData, isTimeBased]);

  const TrendIcon = trend.positive ? TrendingUp : trend.change !== 0 ? TrendingDown : Minus;
  const trendColor = trend.positive ? 'text-success' : trend.change !== 0 ? 'text-destructive' : 'text-muted-foreground';

  // Best value for reference line
  const bestValue = isTimeBased ? exercise.bestTime : exercise.maxWeight;

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
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          isTimeBased ? "bg-success/10" : "bg-primary/10"
        )}>
          {isTimeBased ? (
            <Heart className="w-5 h-5 text-success" />
          ) : (
            <Dumbbell className="w-5 h-5 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{exercise.exerciseName}</h3>
          <p className="text-sm text-muted-foreground">{clientName}</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Target className="w-3.5 h-3.5" />
            {isTimeBased ? 'Nejlepší čas' : 'Max váha'}
          </div>
          <p className="text-lg font-bold tabular-nums">
            {isTimeBased && exercise.bestTime ? formatTime(exercise.bestTime) : exercise.maxWeight ? `${exercise.maxWeight} kg` : '-'}
          </p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Trophy className="w-3.5 h-3.5" />
            Počet PR
          </div>
          <p className="text-lg font-bold tabular-nums">{exercise.prCount}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <TrendIcon className={cn("w-3.5 h-3.5", trendColor)} />
            Trend
          </div>
          <p className={cn("text-lg font-bold tabular-nums", trendColor)}>
            {trend.change > 0 ? '+' : ''}{isTimeBased ? `${Math.abs(Math.round(trend.change))}s` : `${Math.abs(trend.change)} kg`}
          </p>
        </Card>
      </div>

      {/* Progress Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Progrese</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
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
                          {data.isPR && (
                            <Badge className="mt-1 bg-amber-500/20 text-amber-600 text-[10px]">
                              PR!
                            </Badge>
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
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      if (payload.isPR) {
                        return (
                          <circle 
                            key={`dot-${cx}-${cy}`}
                            cx={cx} 
                            cy={cy} 
                            r={5} 
                            fill="hsl(var(--warning))" 
                            stroke="hsl(var(--background))"
                            strokeWidth={2}
                          />
                        );
                      }
                      return (
                        <circle 
                          key={`dot-${cx}-${cy}`}
                          cx={cx} 
                          cy={cy} 
                          r={3} 
                          fill="hsl(var(--primary))" 
                        />
                      );
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
            <p className="text-sm text-muted-foreground text-center py-4">
              Žádné záznamy
            </p>
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
    return exercises.filter(e => 
      e.exerciseName.toLowerCase().includes(query)
    );
  }, [exercises, searchQuery]);

  // Separate strength vs cardio
  const strengthExercises = filteredExercises.filter(e => !e.isTimeBased);
  const cardioExercises = filteredExercises.filter(e => e.isTimeBased);

  const handleClientChange = (value: string) => {
    setSelectedClientId(value || null);
    setSelectedExercise(null);
    setSearchQuery('');
  };

  const handleBack = () => {
    setSelectedExercise(null);
  };

  return (
    <div className="space-y-4">
      {/* Client Search */}
      {!selectedExercise && (
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3 -mx-4 px-4 border-b">
          <div className="flex flex-col sm:flex-row gap-3">
            <ClientSearchSelect
              clients={clients}
              value={selectedClientId || ''}
              onValueChange={handleClientChange}
              placeholder="Vyberte klienta..."
              filterArchived
              className="w-full sm:w-[250px]"
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
            onBack={handleBack}
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
            className="space-y-6"
          >
            {/* Client Header */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">
                  {selectedClient?.first_name?.charAt(0) || selectedClient?.name?.charAt(0) || '?'}
                </span>
              </div>
              <div>
                <h3 className="font-semibold">
                  {selectedClient?.name || `${selectedClient?.first_name} ${selectedClient?.last_name}`}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {exercises.length} cviků • {exercises.reduce((sum, e) => sum + e.count, 0)} záznamů celkem
                </p>
              </div>
            </div>

            {/* Strength Exercises */}
            {strengthExercises.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Dumbbell className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-medium">Síla ({strengthExercises.length})</h4>
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
                  <h4 className="text-sm font-medium">Kardio ({cardioExercises.length})</h4>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
