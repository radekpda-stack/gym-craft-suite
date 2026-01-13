import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Dumbbell, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { TrackedExerciseProgress } from '@/hooks/useClientProgressData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TrackedExercisesChartProps {
  exercises: TrackedExerciseProgress[];
  isLoading?: boolean;
}

export function TrackedExercisesChart({ exercises, isLoading }: TrackedExercisesChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Dumbbell className="w-4 h-4" />
            Sledované cviky
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
            Sledované cviky
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-8">
            Tvůj trenér zatím neoznačil žádné cviky ke sledování.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Dumbbell className="w-4 h-4" />
          Sledované cviky
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={exercises[0]?.exerciseName} className="w-full">
          <TabsList className="w-full flex-wrap h-auto gap-1 mb-4">
            {exercises.map((exercise) => (
              <TabsTrigger 
                key={exercise.exerciseName} 
                value={exercise.exerciseName}
                className="text-xs"
              >
                {exercise.exerciseName}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {exercises.map((exercise) => {
            const data = exercise.data;
            const firstWeight = data[0]?.weight || 0;
            const lastWeight = data[data.length - 1]?.weight || 0;
            const change = lastWeight - firstWeight;
            
            const TrendIcon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
            const trendColor = change > 0 ? 'text-success' : change < 0 ? 'text-destructive' : 'text-muted-foreground';
            
            const chartData = data.map(d => ({
              date: format(parseISO(d.date), 'd. M.', { locale: cs }),
              fullDate: format(parseISO(d.date), 'd. MMMM yyyy', { locale: cs }),
              weight: d.weight,
              reps: d.reps,
              volume: d.volume,
            }));
            
            return (
              <TabsContent key={exercise.exerciseName} value={exercise.exerciseName}>
                <div className="flex items-center justify-end mb-2">
                  <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
                    <TrendIcon className="w-3 h-3" />
                    <span>{change > 0 ? '+' : ''}{change.toFixed(1)} kg</span>
                  </div>
                </div>
                
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
                                <p className="font-semibold">{p.weight} kg × {p.reps} rep</p>
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
                        dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                        activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
