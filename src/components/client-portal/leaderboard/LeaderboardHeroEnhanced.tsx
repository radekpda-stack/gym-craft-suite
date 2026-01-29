import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Rocket, Gem, Sparkles, Target, Trophy, Dumbbell, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { usePerformanceBenchmarks } from '@/hooks/usePerformanceBenchmarks';
import { CircularPercentileGauge } from './CircularPercentileGauge';
import { useClientStreak } from '@/hooks/useClientXPLevel';

interface LeaderboardHeroEnhancedProps {
  clientId: string | undefined;
}

// Positive framing - never make user feel bad
function getPercentileMessage(percentile: number): { text: string; emoji: string } {
  if (percentile >= 90) return { text: 'Jsi absolutní špička!', emoji: '🏆' };
  if (percentile >= 75) return { text: 'Patříš mezi nejlepší!', emoji: '⭐' };
  if (percentile >= 50) return { text: 'Nad průměrem! Skvělá práce.', emoji: '📈' };
  if (percentile >= 25) return { text: 'Stavíš pevné základy!', emoji: '🧱' };
  return { text: 'Tvá cesta právě začíná!', emoji: '🌱' };
}

// Calculate next milestone based on current percentile
function getNextMilestone(currentPercentile: number): { target: number; label: string } {
  if (currentPercentile >= 90) return { target: 100, label: 'TOP 1%' };
  if (currentPercentile >= 75) return { target: 90, label: 'TOP 10%' };
  if (currentPercentile >= 50) return { target: 75, label: 'TOP 25%' };
  if (currentPercentile >= 25) return { target: 50, label: 'Nad průměrem' };
  return { target: 25, label: 'Pevné základy' };
}

export default function LeaderboardHeroEnhanced({ clientId }: LeaderboardHeroEnhancedProps) {
  const { data: benchmarks, isLoading } = usePerformanceBenchmarks(clientId);
  const { data: streakData } = useClientStreak(clientId);

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 via-background to-primary/10 border-primary/20 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <Skeleton className="w-28 h-28 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!benchmarks || benchmarks.overallPercentile === null) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-gradient-to-br from-muted/30 via-background to-muted/20 border-border/50 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-5">
              <motion.div 
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-400/20 to-sky-400/10 flex items-center justify-center"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Rocket className="w-10 h-10 text-sky-400" />
              </motion.div>
              <div>
                <h3 className="text-lg font-semibold">Připrav se na start! 🚀</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Až budeš mít první záznamy, uvidíš zde své srovnání s ostatními.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const { text: message, emoji } = getPercentileMessage(benchmarks.overallPercentile);
  const isTopPerformer = benchmarks.overallPercentile >= 75;
  const milestone = getNextMilestone(benchmarks.overallPercentile);
  const progressToMilestone = Math.min(100, (benchmarks.overallPercentile / milestone.target) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={cn(
        "overflow-hidden border transition-all duration-300",
        isTopPerformer 
          ? "bg-gradient-to-br from-primary/10 via-background to-amber-500/5 border-primary/30" 
          : "bg-gradient-to-br from-muted/30 via-background to-muted/20 border-border/50"
      )}>
        {/* Subtle animated background for top performers */}
        {isTopPerformer && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-amber-500/5 pointer-events-none"
            animate={{
              backgroundPosition: ['0% 0%', '100% 0%', '0% 0%']
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{ backgroundSize: '200% 100%' }}
          />
        )}
        
        <CardContent className="p-5 relative">
          {/* Main content */}
          <div className="flex flex-col gap-5">
            {/* Top row: Gauge + Message + Quick Stats */}
            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* Circular Gauge */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className="shrink-0"
              >
                <CircularPercentileGauge 
                  percentile={benchmarks.overallPercentile} 
                  size="lg"
                  showLabel={false}
                />
              </motion.div>
              
              {/* Message and stats */}
              <div className="flex-1 text-center sm:text-left min-w-0">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                    <span className="text-2xl">{emoji}</span>
                    <h3 className="text-lg font-semibold">{message}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Lepší než <span className="font-semibold">{Math.round(benchmarks.overallPercentile)}%</span> ostatních
                  </p>
                </motion.div>
                
                {/* Quick stats row */}
                <motion.div 
                  className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/20">
                    <Trophy className="w-4 h-4 text-warning" />
                    <span className="text-sm font-semibold">{benchmarks.prCount}</span>
                    <span className="text-xs text-muted-foreground">PRs</span>
                  </div>
                  
                  {streakData && streakData.currentStreak > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <span className="text-base">🔥</span>
                      <span className="text-sm font-semibold">{streakData.currentStreak}</span>
                      <span className="text-xs text-muted-foreground">týdnů</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                    <Dumbbell className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold">{benchmarks.percentiles.length}</span>
                    <span className="text-xs text-muted-foreground">cviků</span>
                  </div>
                </motion.div>
              </div>
            </div>
            
            {/* Strongest & Weakest row */}
            {(benchmarks.strongestExercise || benchmarks.weakestExercise) && (
              <motion.div 
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-border/30"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {benchmarks.strongestExercise && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-400/5 border border-emerald-400/10">
                    <div className="w-10 h-10 rounded-lg bg-emerald-400/10 flex items-center justify-center shrink-0">
                      <Gem className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-emerald-400 font-medium">Tvá síla 💪</p>
                      <p className="font-semibold truncate capitalize text-sm">{benchmarks.strongestExercise.name}</p>
                      <p className="text-xs text-muted-foreground">TOP {100 - benchmarks.strongestExercise.percentile}%</p>
                    </div>
                  </div>
                )}
                
                {benchmarks.weakestExercise && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-sky-400/5 border border-sky-400/10">
                    <div className="w-10 h-10 rounded-lg bg-sky-400/10 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 text-sky-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-sky-400 font-medium">Příležitost k růstu 🌱</p>
                      <p className="font-semibold truncate capitalize text-sm">{benchmarks.weakestExercise.name}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
            
            {/* Next milestone progress */}
            {benchmarks.overallPercentile < 90 && (
              <motion.div 
                className="pt-4 border-t border-border/30"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Další cíl: {milestone.label}</span>
                </div>
                <div className="relative">
                  <Progress value={progressToMilestone} className="h-2.5" />
                  <div className="flex justify-between mt-1.5">
                    <span className="text-xs text-muted-foreground">
                      Aktuálně {Math.round(benchmarks.overallPercentile)}%
                    </span>
                    <span className="text-xs font-medium text-primary">
                      {Math.round(progressToMilestone)}% k cíli
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
