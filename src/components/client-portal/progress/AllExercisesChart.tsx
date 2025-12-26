import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Dumbbell, TrendingUp, TrendingDown, Minus, Trophy, Search } from 'lucide-react';
import { ClientExerciseProgress } from '@/hooks/useClientAllExercises';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface AllExercisesChartProps {
  exercises: ClientExerciseProgress[];
  isLoading?: boolean;
}

export function AllExercisesChart({ exercises, isLoading }: AllExercisesChartProps) {
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter exercises based on search
  const filteredExercises = useMemo(() => {
    if (!searchQuery) return exercises;
    const query = searchQuery.toLowerCase();
    return exercises.filter(e => e.exerciseName.toLowerCase().includes(query));
  }, [exercises, searchQuery]);

  // Auto-select first exercise when data loads
  const currentExercise = useMemo(() => {
    if (!selectedExercise && exercises.length > 0) {
      return exercises[0];
    }
    return exercises.find(e => e.exerciseName === selectedExercise) || null;
  }, [exercises, selectedExercise]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Dumbbell className="w-4 h-4" />
            Tvoje cviky
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Načítám...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!exercises || exercises.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Dumbbell className="w-4 h-4" />
            Tvoje cviky
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-8">
            Zatím nemáš zapsané žádné silové cviky.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate trend for current exercise
  const data = currentExercise?.data || [];
  const firstWeight = data[0]?.weight || 0;
  const lastWeight = data[data.length - 1]?.weight || 0;
  const change = lastWeight - firstWeight;

  const TrendIcon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
  const trendColor = change > 0 ? 'text-green-600' : change < 0 ? 'text-red-500' : 'text-muted-foreground';

  const chartData = data.map(d => ({
    date: format(parseISO(d.date), 'd. M.', { locale: cs }),
    fullDate: format(parseISO(d.date), 'd. MMMM yyyy', { locale: cs }),
    weight: d.weight,
    reps: d.reps,
    volume: d.volume,
    isPR: d.isPR,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Dumbbell className="w-4 h-4" />
            Tvoje cviky
            <Badge variant="secondary" className="ml-1 text-xs">
              {exercises.length}
            </Badge>
          </CardTitle>
          
          {/* Exercise selector */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Hledat cvik..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Select
              value={selectedExercise || currentExercise?.exerciseName || ''}
              onValueChange={setSelectedExercise}
            >
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="Vyber cvik" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {filteredExercises.map((exercise) => (
                  <SelectItem 
                    key={exercise.exerciseName} 
                    value={exercise.exerciseName}
                    className="text-sm"
                  >
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="truncate">{exercise.exerciseName}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {exercise.count}×
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {currentExercise && (
          <>
            {/* Stats row */}
            <div className="flex items-center justify-between mb-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  Max: <span className="font-medium text-foreground">{currentExercise.maxWeight} kg</span>
                </span>
                {currentExercise.prCount > 0 && (
                  <span className="flex items-center gap-1 text-yellow-600">
                    <Trophy className="w-3 h-3" />
                    {currentExercise.prCount} PR
                  </span>
                )}
              </div>
              <div className={`flex items-center gap-1 ${trendColor}`}>
                <TrendIcon className="w-3 h-3" />
                <span>{change > 0 ? '+' : ''}{change.toFixed(1)} kg</span>
              </div>
            </div>

            {/* Chart */}
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    className="fill-muted-foreground"
                  />
                  <YAxis 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    domain={['dataMin - 5', 'dataMax + 5']}
                    tickFormatter={(value) => `${value} kg`}
                    className="fill-muted-foreground"
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const p = payload[0].payload;
                        return (
                          <div className="bg-popover border rounded-lg shadow-lg p-2 text-xs">
                            <p className="text-muted-foreground">{p.fullDate}</p>
                            <p className="font-semibold flex items-center gap-1">
                              {p.weight} kg × {p.reps} rep
                              {p.isPR && <Trophy className="w-3 h-3 text-yellow-500" />}
                            </p>
                            <p className="text-muted-foreground">Objem: {p.volume} kg</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={({ cx, cy, payload }) => {
                      if (payload.isPR) {
                        return (
                          <circle
                            key={`pr-${cx}-${cy}`}
                            cx={cx}
                            cy={cy}
                            r={5}
                            fill="hsl(45, 93%, 47%)"
                            stroke="hsl(45, 93%, 47%)"
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
                          strokeWidth={0}
                        />
                      );
                    }}
                    activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
