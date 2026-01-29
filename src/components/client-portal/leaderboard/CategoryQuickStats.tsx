import { motion } from 'framer-motion';
import { TrendingUp, Trophy, Target, Dumbbell, Heart, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ExerciseWithPercentile } from '@/hooks/useExercisePercentiles';

interface CategoryQuickStatsProps {
  exercises: ExerciseWithPercentile[];
  exerciseType: 'strength' | 'cardio' | 'plyometrics';
}

export function CategoryQuickStats({ exercises, exerciseType }: CategoryQuickStatsProps) {
  if (!exercises || exercises.length === 0) return null;

  // Filter exercises with valid percentiles
  const exercisesWithPercentiles = exercises.filter(e => e.client_percentile !== null);
  
  if (exercisesWithPercentiles.length === 0) return null;

  // Calculate average percentile
  const avgPercentile = Math.round(
    exercisesWithPercentiles.reduce((sum, e) => sum + (e.client_percentile || 0), 0) / 
    exercisesWithPercentiles.length
  );

  // Find top exercise (highest percentile)
  const topExercise = exercisesWithPercentiles.reduce((best, current) => 
    (current.client_percentile || 0) > (best.client_percentile || 0) ? current : best
  , exercisesWithPercentiles[0]);

  // Find exercise with most room for improvement (lowest percentile but still has data)
  const growthExercise = exercisesWithPercentiles.reduce((worst, current) => 
    (current.client_percentile || 100) < (worst.client_percentile || 100) ? current : worst
  , exercisesWithPercentiles[0]);

  const getCategoryConfig = () => {
    switch (exerciseType) {
      case 'strength':
        return {
          icon: Dumbbell,
          color: 'text-primary',
          bgColor: 'bg-primary/10',
          borderColor: 'border-primary/20',
        };
      case 'plyometrics':
        return {
          icon: Zap,
          color: 'text-warning',
          bgColor: 'bg-warning/10',
          borderColor: 'border-warning/20',
        };
      case 'cardio':
        return {
          icon: Heart,
          color: 'text-success',
          bgColor: 'bg-success/10',
          borderColor: 'border-success/20',
        };
    }
  };

  const config = getCategoryConfig();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-3 gap-2"
    >
      {/* Average Percentile */}
      <Card className={cn("border", config.borderColor)}>
        <CardContent className="p-3 text-center">
          <div className={cn("w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center", config.bgColor)}>
            <TrendingUp className={cn("w-4 h-4", config.color)} />
          </div>
          <div className="text-2xl font-bold tabular-nums">{avgPercentile}%</div>
          <div className="text-xs text-muted-foreground">Ø Percentil</div>
        </CardContent>
      </Card>

      {/* Top Exercise */}
      <Card className="border border-emerald-400/20">
        <CardContent className="p-3 text-center">
          <div className="w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center bg-emerald-400/10">
            <Trophy className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-semibold truncate capitalize" title={topExercise.exercise_name}>
            {topExercise.exercise_name}
          </div>
          <div className="text-xs text-emerald-400 font-medium">
            {topExercise.client_percentile}%ile
          </div>
        </CardContent>
      </Card>

      {/* Growth Opportunity */}
      <Card className="border border-sky-400/20">
        <CardContent className="p-3 text-center">
          <div className="w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center bg-sky-400/10">
            <Target className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-sm font-semibold truncate capitalize" title={growthExercise.exercise_name}>
            {growthExercise.exercise_name}
          </div>
          <div className="text-xs text-sky-400 font-medium">
            Příležitost 🌱
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
