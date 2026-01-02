import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useWeeklyGoals, WeeklyGoal } from '@/hooks/useWeeklyGoals';
import { Target, CheckCircle2, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ClientWeeklyGoalsProps {
  clientId: string;
}

function GoalItem({ goal }: { goal: WeeklyGoal }) {
  const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
  const isCompleted = goal.current >= goal.target;

  return (
    <div className={cn(
      'p-3 rounded-lg border transition-colors',
      isCompleted ? 'bg-green-500/10 border-green-500/30' : 'bg-secondary/30 border-transparent'
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : (
            <Target className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">{goal.label}</span>
        </div>
        <Badge variant={isCompleted ? 'default' : 'secondary'} className="text-xs">
          {goal.current}/{goal.target}
        </Badge>
      </div>
      <Progress value={Math.min(progress, 100)} className="h-1.5" />
    </div>
  );
}

export function ClientWeeklyGoals({ clientId }: ClientWeeklyGoalsProps) {
  const { data: goals, isLoading } = useWeeklyGoals(clientId);
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return <Skeleton className="h-24 rounded-xl" />;
  }

  if (!goals || goals.length === 0) {
    return null;
  }

  const completedCount = goals.filter(g => g.current >= g.target).length;
  const totalXP = goals.reduce((sum, g) => sum + (g.current >= g.target ? g.xpReward : 0), 0);

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Týdenní cíle
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {completedCount}/{goals.length}
            </Badge>
            {totalXP > 0 && (
              <Badge className="gap-1 bg-amber-500/20 text-amber-600 border-amber-500/30">
                <Zap className="w-3 h-3" />
                +{totalXP} XP
              </Badge>
            )}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </button>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {goals.map(goal => (
              <GoalItem key={goal.id} goal={goal} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
