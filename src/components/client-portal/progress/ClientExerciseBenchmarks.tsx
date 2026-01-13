import { motion } from 'framer-motion';
import { TrendingUp, Dumbbell, Users, Lightbulb, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePerformanceBenchmarks } from '@/hooks/usePerformanceBenchmarks';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ClientExerciseBenchmarksProps {
  clientId: string;
}

function getPercentileStyle(percentile: number) {
  if (percentile >= 75) return { 
    color: 'text-success', 
    progressColor: 'bg-success',
    label: `Top ${Math.round(100 - percentile)}%` 
  };
  if (percentile >= 50) return { 
    color: 'text-warning', 
    progressColor: 'bg-warning',
    label: 'Nad průměr' 
  };
  if (percentile >= 25) return { 
    color: 'text-muted-foreground', 
    progressColor: 'bg-muted-foreground',
    label: 'Průměr' 
  };
  return { 
    color: 'text-destructive', 
    progressColor: 'bg-destructive',
    label: 'Pod průměrem' 
  };
}

export function ClientExerciseBenchmarks({ clientId }: ClientExerciseBenchmarksProps) {
  const navigate = useNavigate();
  const { data: benchmarks, isLoading } = usePerformanceBenchmarks(clientId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!benchmarks || !benchmarks.percentiles || Object.keys(benchmarks.percentiles).length === 0) {
    return null;
  }

  // Get top exercises sorted by percentile (show best first)
  // percentiles is an array, not an object
  const exerciseList = benchmarks.percentiles
    .slice()
    .sort((a, b) => b.percentile - a.percentile)
    .slice(0, 6);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Srovnání s ostatními klienty
            </span>
            <Badge 
              variant="outline" 
              className="cursor-pointer hover:bg-muted"
              onClick={() => navigate('/zona/leaderboard')}
            >
              Žebříček
              <ChevronRight className="w-3 h-3 ml-1" />
            </Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Tvoje maximální výkony ve srovnání s ostatními klienty. Percentil ukazuje, kolik procent klientů jsi překonal.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {exerciseList.map((exercise, index) => {
            const style = getPercentileStyle(exercise.percentile);
            
            return (
              <motion.div
                key={exercise.exercise}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3"
              >
                <div className="w-5 shrink-0">
                  <Dumbbell className="w-4 h-4 text-muted-foreground" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate capitalize">
                      {exercise.exercise}
                    </span>
                    <Badge variant="secondary" className={cn("text-xs shrink-0", style.color)}>
                      {style.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={exercise.percentile} 
                      className="h-1.5 flex-1" 
                    />
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      {Math.round(exercise.percentile)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      Tvůj max: <span className="font-medium">{exercise.clientValue} kg</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Medián: {exercise.median?.toFixed(0) || '–'} kg
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Tip for weakest exercise */}
          {benchmarks.weakestExercise && (
            <div className="flex items-start gap-2 p-3 mt-2 rounded-lg bg-primary/5 border border-primary/10">
              <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Tip:</span> Zaměř se na{' '}
                <span className="font-medium capitalize">{benchmarks.weakestExercise.name}</span> – máš prostor ke zlepšení!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
