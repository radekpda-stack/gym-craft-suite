import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useWeeklyGoals, WeeklyGoal } from '@/hooks/useWeeklyGoals';
import { Target, CheckCircle2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WeeklyGoalsCardProps {
  clientId: string;
}

function GoalItem({ goal, index }: { goal: WeeklyGoal; index: number }) {
  const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`p-3 rounded-lg border ${
        goal.completed 
          ? 'bg-green-500/5 border-green-500/30' 
          : 'bg-muted/50 border-border'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {goal.completed ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : (
            <Target className="w-4 h-4 text-muted-foreground" />
          )}
          <span className={`text-sm font-medium ${goal.completed ? 'text-green-600' : ''}`}>
            {goal.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-primary" />
          <span className="text-xs text-muted-foreground">+{goal.xpReward} XP</span>
        </div>
      </div>
      
      <div className="space-y-1">
        <Progress 
          value={progress} 
          className={`h-2 ${goal.completed ? '[&>div]:bg-green-500' : ''}`}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{goal.current} / {goal.target}</span>
          {goal.completed && (
            <Badge variant="secondary" className="h-4 text-[10px] bg-green-500/10 text-green-600">
              Splněno!
            </Badge>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function WeeklyGoalsCard({ clientId }: WeeklyGoalsCardProps) {
  const { data: goals, isLoading } = useWeeklyGoals(clientId);

  if (isLoading) {
    return <Skeleton className="h-48" />;
  }

  if (!goals || goals.length === 0) {
    return null;
  }

  const completedCount = goals.filter(g => g.completed).length;
  const allCompleted = completedCount === goals.length;

  return (
    <Card className={`${allCompleted ? 'border-green-500/30 bg-green-500/5' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Týdenní cíle
          </CardTitle>
          <Badge 
            variant={allCompleted ? 'default' : 'secondary'}
            className={allCompleted ? 'bg-green-500' : ''}
          >
            {completedCount} / {goals.length}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <AnimatePresence>
          {goals.map((goal, index) => (
            <GoalItem key={goal.id} goal={goal} index={index} />
          ))}
        </AnimatePresence>
        
        {allCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-2 text-green-600 font-medium"
          >
            🎉 Skvělá práce! Všechny cíle splněny!
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
