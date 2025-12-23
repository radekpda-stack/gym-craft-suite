import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Dumbbell, TrendingUp, User, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { AnnualStatsData } from '@/hooks/useAnnualStats';

interface ExerciseCountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: AnnualStatsData | undefined;
}

export function ExerciseCountModal({ open, onOpenChange, stats }: ExerciseCountModalProps) {
  if (!stats) return null;

  const avgExercisesPerTraining = stats.completedTrainings > 0 
    ? (stats.totalExerciseEntries / stats.completedTrainings).toFixed(1) 
    : '0';

  // Prepare chart data for top exercises
  const chartData = stats.topExercises.slice(0, 8).map(exercise => ({
    name: exercise.name.length > 12 ? exercise.name.substring(0, 12) + '...' : exercise.name,
    fullName: exercise.name,
    count: exercise.count,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-warning/10">
              <Dumbbell className="h-5 w-5 text-warning" />
            </div>
            Zapsané cviky - detail
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Main value */}
          <div className="text-center py-4 bg-warning/5 rounded-xl">
            <p className="text-4xl font-bold text-warning">
              {stats.totalExerciseEntries.toLocaleString('cs-CZ')}
            </p>
            <p className="text-sm text-muted-foreground mt-1">zapsaných cviků tento rok</p>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-secondary/50 text-center">
              <Dumbbell className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">{stats.uniqueExercises}</p>
              <p className="text-xs text-muted-foreground">unikátních</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 text-center">
              <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">{avgExercisesPerTraining}</p>
              <p className="text-xs text-muted-foreground">na trénink</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 text-center">
              <BarChart3 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">{stats.totalPRs}</p>
              <p className="text-xs text-muted-foreground">PR</p>
            </div>
          </div>

          {/* Top exercises chart */}
          {chartData.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Top 8 nejčastějších cviků</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={true} vertical={false} />
                    <XAxis 
                      type="number"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={80}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${value}×`, 'Počet']}
                      labelFormatter={(label, payload) => payload[0]?.payload?.fullName || label}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="hsl(var(--warning))" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Least used exercises */}
          {stats.leastUsedExercises && stats.leastUsedExercises.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3 text-muted-foreground">Nejméně používané</h4>
              <div className="space-y-1">
                {stats.leastUsedExercises.map((exercise, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-secondary/30">
                    <span className="text-muted-foreground">{exercise.name}</span>
                    <span className="text-muted-foreground">{exercise.count}×</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
