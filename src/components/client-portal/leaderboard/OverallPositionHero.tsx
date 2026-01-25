import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Target, Rocket, Gem, Crown, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { usePerformanceBenchmarks } from '@/hooks/usePerformanceBenchmarks';
import { CircularPercentileGauge } from './CircularPercentileGauge';

interface OverallPositionHeroProps {
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

export default function OverallPositionHero({ clientId }: OverallPositionHeroProps) {
  const { data: benchmarks, isLoading } = usePerformanceBenchmarks(clientId);

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
        
        <CardContent className="p-6 relative">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Circular Gauge */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
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
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <span className="text-2xl">{emoji}</span>
                  <h3 className="text-lg font-semibold">{message}</h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  Lepší než <span className="font-semibold">{Math.round(benchmarks.overallPercentile)}%</span> ostatních klientů
                </p>
              </motion.div>
              
              {/* Strongest & Weakest - Positive framing */}
              {(benchmarks.strongestExercise || benchmarks.weakestExercise) && (
                <div className="mt-4 pt-4 border-t border-border/30 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {benchmarks.strongestExercise && (
                    <motion.div 
                      className="flex items-center gap-3 p-3 rounded-xl bg-emerald-400/5 border border-emerald-400/10"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <div className="w-9 h-9 rounded-lg bg-emerald-400/10 flex items-center justify-center shrink-0">
                        <Gem className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-emerald-400 font-medium">Tvá síla 💪</p>
                        <p className="font-semibold truncate capitalize text-sm">{benchmarks.strongestExercise.name}</p>
                      </div>
                    </motion.div>
                  )}
                  
                  {benchmarks.weakestExercise && (
                    <motion.div 
                      className="flex items-center gap-3 p-3 rounded-xl bg-sky-400/5 border border-sky-400/10"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <div className="w-9 h-9 rounded-lg bg-sky-400/10 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-sky-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-sky-400 font-medium">Příležitost k růstu 🌱</p>
                        <p className="font-semibold truncate capitalize text-sm">{benchmarks.weakestExercise.name}</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
