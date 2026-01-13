import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyWeeklyGoals, WeeklyGoal } from '@/hooks/useWeeklyGoals';
import { Target, CheckCircle2, Zap, Rocket, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { endOfWeek, differenceInHours, differenceInDays } from 'date-fns';

interface WeeklyMissionsCardProps {
  className?: string;
}

function MissionItem({ goal, index }: { goal: WeeklyGoal; index: number }) {
  const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
  const isCompleted = goal.completed;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "p-3 rounded-lg border transition-all",
        isCompleted 
          ? "bg-success/10 border-success/30" 
          : "bg-secondary/30 border-transparent hover:bg-secondary/50"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Status icon */}
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
          isCompleted ? "bg-success/20" : "bg-primary/10"
        )}>
          {isCompleted ? (
            <CheckCircle2 className="w-4 h-4 text-success" />
          ) : (
            <Target className="w-4 h-4 text-primary" />
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={cn(
              "text-sm font-medium truncate",
              isCompleted && "text-success"
            )}>
              {goal.label}
            </span>
            <Badge 
              variant="secondary" 
              className={cn(
                "shrink-0 gap-1 text-xs",
                isCompleted 
                  ? "bg-success/10 text-success" 
                  : "bg-warning/10 text-warning"
              )}
            >
              <Zap className="w-3 h-3" />
              +{goal.xpReward}
            </Badge>
          </div>
          
          {/* Progress */}
          <div className="mt-2 space-y-1">
            <Progress 
              value={Math.min(progress, 100)} 
              className={cn(
                "h-1.5",
                isCompleted && "[&>div]:bg-success"
              )}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{goal.current} / {goal.target}</span>
              {isCompleted && (
                <span className="text-success font-medium">Splněno!</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function WeeklyMissionsCard({ className }: WeeklyMissionsCardProps) {
  const { data: goals, isLoading } = useMyWeeklyGoals();
  
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (!goals || goals.length === 0) {
    return null;
  }
  
  const completedCount = goals.filter(g => g.completed).length;
  const allCompleted = completedCount === goals.length;
  const totalXpPossible = goals.reduce((sum, g) => sum + g.xpReward, 0);
  const earnedXp = goals.filter(g => g.completed).reduce((sum, g) => sum + g.xpReward, 0);
  
  // Calculate time remaining in week
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const hoursRemaining = differenceInHours(weekEnd, new Date());
  const daysRemaining = differenceInDays(weekEnd, new Date());
  
  return (
    <Card className={cn(
      "transition-all",
      allCompleted && "border-success/30 bg-success/5",
      className
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="w-4 h-4 text-primary" />
            Týdenní mise
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Time remaining */}
            <Badge variant="outline" className="gap-1 text-xs">
              <Clock className="w-3 h-3" />
              {daysRemaining > 0 ? `${daysRemaining}d` : `${hoursRemaining}h`}
            </Badge>
            
            {/* Progress badge */}
            <Badge 
              variant={allCompleted ? 'default' : 'secondary'}
              className={cn(
                "gap-1",
                allCompleted && "bg-success"
              )}
            >
              <CheckCircle2 className="w-3 h-3" />
              {completedCount}/{goals.length}
            </Badge>
          </div>
        </div>
        
        {/* XP summary */}
        {earnedXp > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Zap className="w-3 h-3 text-yellow-500" />
            <span>
              Získáno {earnedXp} / {totalXpPossible} XP
            </span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-2">
        <AnimatePresence>
          {goals.map((goal, index) => (
            <MissionItem key={goal.id} goal={goal} index={index} />
          ))}
        </AnimatePresence>
        
        {allCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-2 text-success font-medium flex items-center justify-center gap-2"
          >
            <span className="text-lg">🎉</span>
            <span>Všechny mise splněny!</span>
            <span className="text-lg">🎉</span>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
