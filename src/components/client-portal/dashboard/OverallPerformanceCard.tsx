import { motion } from 'framer-motion';
import { TrendingUp, Trophy, Target, Dumbbell, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePerformanceBenchmarks } from '@/hooks/usePerformanceBenchmarks';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface OverallPerformanceCardProps {
  clientId: string;
}

function getPercentileStyle(percentile: number) {
  if (percentile >= 75) return { 
    color: 'text-emerald-600 dark:text-emerald-400', 
    bg: 'bg-emerald-500/10',
    label: `Top ${Math.round(100 - percentile)}%` 
  };
  if (percentile >= 50) return { 
    color: 'text-amber-600 dark:text-amber-400', 
    bg: 'bg-amber-500/10',
    label: 'Nad průměr' 
  };
  if (percentile >= 25) return { 
    color: 'text-muted-foreground', 
    bg: 'bg-muted',
    label: 'Průměr' 
  };
  return { 
    color: 'text-orange-600 dark:text-orange-400', 
    bg: 'bg-orange-500/10',
    label: 'Pod průměrem' 
  };
}

export function OverallPerformanceCard({ clientId }: OverallPerformanceCardProps) {
  const navigate = useNavigate();
  const { data: benchmarks, isLoading } = usePerformanceBenchmarks(clientId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!benchmarks || benchmarks.overallPercentile === null) {
    return null;
  }

  const percentileStyle = getPercentileStyle(benchmarks.overallPercentile);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card 
        className="cursor-pointer hover:border-primary/30 transition-colors"
        onClick={() => navigate('/client/leaderboard')}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Můj celkový výkon
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Jak si vedeš ve srovnání s ostatními klienty
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall percentile */}
          <div className={cn("p-3 rounded-xl", percentileStyle.bg)}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Celkové umístění</span>
              <Badge variant="secondary" className={cn("font-bold", percentileStyle.color)}>
                {percentileStyle.label}
              </Badge>
            </div>
            <Progress value={benchmarks.overallPercentile} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1.5">
              Lepší než {Math.round(benchmarks.overallPercentile)}% ostatních klientů
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Strongest exercise */}
            {benchmarks.strongestExercise && (
              <div className="p-3 rounded-xl bg-muted/50 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Trophy className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Nejsilnější</span>
                </div>
                <p className="font-medium text-sm truncate capitalize">
                  {benchmarks.strongestExercise.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Top {Math.round(100 - benchmarks.strongestExercise.percentile)}%
                </p>
              </div>
            )}

            {/* PR rank */}
            <div className="p-3 rounded-xl bg-muted/50 space-y-1">
              <div className="flex items-center gap-1.5 text-primary">
                <Target className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">PR Rank</span>
              </div>
              <p className="font-medium text-sm">
                #{benchmarks.prRank || '–'} / {benchmarks.totalClients || '–'}
              </p>
              <p className="text-xs text-muted-foreground">
                {benchmarks.prCount} osobních rekordů
              </p>
            </div>
          </div>

          {/* Weakest exercise hint */}
          {benchmarks.weakestExercise && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/5 border border-orange-500/10">
              <Dumbbell className="w-4 h-4 text-orange-500 shrink-0" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium capitalize">{benchmarks.weakestExercise.name}</span> – prostor ke zlepšení
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
