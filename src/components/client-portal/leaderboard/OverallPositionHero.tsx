import { motion } from 'framer-motion';
import { Trophy, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { usePerformanceBenchmarks } from '@/hooks/usePerformanceBenchmarks';

interface OverallPositionHeroProps {
  clientId: string | undefined;
}

function getPercentileMessage(percentile: number): { text: string; emoji: string } {
  if (percentile >= 90) return { text: 'Jsi absolutní špička!', emoji: '🔥' };
  if (percentile >= 75) return { text: 'Skvělé výsledky!', emoji: '💪' };
  if (percentile >= 50) return { text: 'Nad průměrem!', emoji: '👍' };
  if (percentile >= 25) return { text: 'Držíš tempo!', emoji: '🏃' };
  return { text: 'Prostor ke zlepšení', emoji: '📈' };
}

function getPercentileColor(percentile: number): string {
  if (percentile >= 75) return 'text-emerald-500';
  if (percentile >= 50) return 'text-amber-500';
  if (percentile >= 25) return 'text-orange-500';
  return 'text-muted-foreground';
}

export default function OverallPositionHero({ clientId }: OverallPositionHeroProps) {
  const { data: benchmarks, isLoading } = usePerformanceBenchmarks(clientId);

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 via-background to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="w-20 h-20 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!benchmarks || benchmarks.overallPercentile === null) {
    return (
      <Card className="bg-gradient-to-br from-muted/50 via-background to-muted/30 border-border">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Target className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Začni trénovat</h3>
              <p className="text-sm text-muted-foreground">
                Až budeš mít nějaké záznamy, uvidíš zde své srovnání s ostatními
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { text: message, emoji } = getPercentileMessage(benchmarks.overallPercentile);
  const percentileColor = getPercentileColor(benchmarks.overallPercentile);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="bg-gradient-to-br from-primary/10 via-background to-primary/5 border-primary/20 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Main percentile display */}
            <div className="flex items-center gap-4 flex-1">
              <motion.div 
                className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <Trophy className="w-10 h-10 text-primary" />
              </motion.div>
              
              <div className="min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <motion.span 
                    className={cn("text-3xl sm:text-4xl font-bold", percentileColor)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {Math.round(benchmarks.overallPercentile)}%
                  </motion.span>
                  <span className="text-lg text-muted-foreground">lepší než ostatní</span>
                </div>
                <p className="text-muted-foreground mt-1">
                  <span className="text-xl mr-1">{emoji}</span>
                  {message}
                </p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <Progress 
              value={benchmarks.overallPercentile} 
              className="h-2 bg-muted/50"
            />
          </div>

          {/* Strongest & Weakest exercises */}
          {(benchmarks.strongestExercise || benchmarks.weakestExercise) && (
            <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {benchmarks.strongestExercise && (
                <motion.div 
                  className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Nejsilnější</p>
                    <p className="font-semibold truncate capitalize">{benchmarks.strongestExercise.name}</p>
                  </div>
                </motion.div>
              )}
              
              {benchmarks.weakestExercise && (
                <motion.div 
                  className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/5 border border-orange-500/10"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                    <TrendingDown className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Prostor ke zlepšení</p>
                    <p className="font-semibold truncate capitalize">{benchmarks.weakestExercise.name}</p>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
