import { motion } from 'framer-motion';
import { Target, Dumbbell, Heart, Zap, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ExerciseWithPercentile } from '@/hooks/useExercisePercentiles';

interface MilestonesSectionProps {
  strengthExercises: ExerciseWithPercentile[];
  cardioExercises: ExerciseWithPercentile[];
  plyometricsExercises: ExerciseWithPercentile[];
  overallPercentile: number | null;
}

interface Milestone {
  exerciseName: string;
  exerciseType: 'strength' | 'cardio' | 'plyometrics' | 'overall';
  currentPercentile: number;
  targetPercentile: number;
  targetLabel: string;
  progressPercent: number;
  improvement: string;
}

// Calculate milestone for an exercise
function calculateMilestone(exercise: ExerciseWithPercentile, type: 'strength' | 'cardio' | 'plyometrics'): Milestone | null {
  if (exercise.client_percentile === null) return null;
  
  const current = exercise.client_percentile;
  
  // Determine next milestone
  let target: number;
  let label: string;
  
  if (current >= 90) {
    target = 95;
    label = 'TOP 5%';
  } else if (current >= 75) {
    target = 90;
    label = 'TOP 10%';
  } else if (current >= 50) {
    target = 75;
    label = 'TOP 25%';
  } else if (current >= 25) {
    target = 50;
    label = 'Nad průměrem';
  } else {
    target = 25;
    label = 'Pevné základy';
  }
  
  // Calculate progress toward target
  const progressPercent = Math.min(100, (current / target) * 100);
  
  // Calculate rough improvement needed
  const percentileGap = target - current;
  let improvement = `+${percentileGap}%`;
  
  return {
    exerciseName: exercise.exercise_name,
    exerciseType: type,
    currentPercentile: current,
    targetPercentile: target,
    targetLabel: label,
    progressPercent,
    improvement,
  };
}

export function MilestonesSection({
  strengthExercises,
  cardioExercises,
  plyometricsExercises,
  overallPercentile,
}: MilestonesSectionProps) {
  // Get milestones for exercises closest to their next milestone
  const allMilestones: Milestone[] = [];
  
  [...strengthExercises, ...cardioExercises, ...plyometricsExercises].forEach(exercise => {
    const type = strengthExercises.includes(exercise) ? 'strength' 
      : cardioExercises.includes(exercise) ? 'cardio' : 'plyometrics';
    const milestone = calculateMilestone(exercise, type);
    if (milestone && milestone.progressPercent >= 60 && milestone.progressPercent < 100) {
      allMilestones.push(milestone);
    }
  });
  
  // Sort by progress (closest to completion first)
  allMilestones.sort((a, b) => b.progressPercent - a.progressPercent);
  
  // Take top 3
  const topMilestones = allMilestones.slice(0, 3);
  
  // Add overall milestone if applicable
  if (overallPercentile !== null && overallPercentile < 90) {
    let target: number;
    let label: string;
    
    if (overallPercentile >= 75) {
      target = 90;
      label = 'TOP 10%';
    } else if (overallPercentile >= 50) {
      target = 75;
      label = 'TOP 25%';
    } else if (overallPercentile >= 25) {
      target = 50;
      label = 'Nad průměrem';
    } else {
      target = 25;
      label = 'Pevné základy';
    }
    
    const progressPercent = Math.min(100, (overallPercentile / target) * 100);
    
    if (progressPercent >= 50) {
      topMilestones.unshift({
        exerciseName: 'Celkově',
        exerciseType: 'overall',
        currentPercentile: overallPercentile,
        targetPercentile: target,
        targetLabel: label,
        progressPercent,
        improvement: `+${target - overallPercentile}%`,
      });
    }
  }
  
  if (topMilestones.length === 0) return null;
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'strength': return <Dumbbell className="w-4 h-4 text-primary" />;
      case 'cardio': return <Heart className="w-4 h-4 text-success" />;
      case 'plyometrics': return <Zap className="w-4 h-4 text-warning" />;
      default: return <Target className="w-4 h-4 text-accent" />;
    }
  };
  
  const getBgColor = (type: string) => {
    switch (type) {
      case 'strength': return 'bg-primary/5 border-primary/20';
      case 'cardio': return 'bg-success/5 border-success/20';
      case 'plyometrics': return 'bg-warning/5 border-warning/20';
      default: return 'bg-accent/5 border-accent/20';
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <Target className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">Blízké cíle</h2>
      </div>
      
      <div className="space-y-2">
        {topMilestones.slice(0, 3).map((milestone, index) => (
          <motion.div
            key={`${milestone.exerciseName}-${milestone.targetPercentile}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={cn("border overflow-hidden", getBgColor(milestone.exerciseType))}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="shrink-0">
                    {getIcon(milestone.exerciseType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium truncate capitalize">
                        {milestone.exerciseName}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                        {milestone.targetLabel}
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={milestone.progressPercent} className="h-2 flex-1" />
                      <span className="text-xs font-medium tabular-nums shrink-0">
                        {Math.round(milestone.progressPercent)}%
                      </span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        {milestone.currentPercentile}% → {milestone.targetPercentile}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
