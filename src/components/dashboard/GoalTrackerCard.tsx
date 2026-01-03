import { memo } from 'react';
import { Target, Dumbbell, Wallet, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useGoalTracker } from '@/hooks/useGoalTracker';
import { formatCurrency } from '@/lib/formatters';
import { format, isAfter } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export const GoalTrackerCard = memo(function GoalTrackerCard() {
  const { data, isLoading } = useGoalTracker();

  if (isLoading) {
    return (
      <Card className="glass">
        <CardContent className="p-4">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || (!data.trainingsGoal && !data.incomeGoal)) {
    return (
      <Card className="glass border-dashed">
        <CardContent className="p-4 text-center">
          <Target className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Nastavte si měsíční cíle v nastavení</p>
        </CardContent>
      </Card>
    );
  }

  const now = new Date();

  return (
    <Card className="glass">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold">Měsíční cíle</span>
          <span className="text-xs text-muted-foreground ml-auto">
            {data.daysRemaining} dní zbývá
          </span>
        </div>

        <div className="space-y-3">
          {data.trainingsGoal && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-blue-500" />
                  <span>Tréninky</span>
                </div>
                <span className="font-medium">
                  {data.trainingsGoal.currentValue}/{data.trainingsGoal.targetValue}
                </span>
              </div>
              <Progress value={data.trainingsProgress} className="h-2" />
              {data.predictedTrainingsCompletion && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {isAfter(data.predictedTrainingsCompletion, now) 
                    ? `Predikce: ${format(data.predictedTrainingsCompletion, 'd. MMM', { locale: cs })}`
                    : '✓ Cíl splněn!'}
                </p>
              )}
            </div>
          )}

          {data.incomeGoal && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-success" />
                  <span>Příjem</span>
                </div>
                <span className="font-medium">
                  {formatCurrency(data.incomeGoal.currentValue, false)}/{formatCurrency(data.incomeGoal.targetValue, false)}
                </span>
              </div>
              <Progress value={data.incomeProgress} className="h-2" />
              {data.predictedIncomeCompletion && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {isAfter(data.predictedIncomeCompletion, now)
                    ? `Predikce: ${format(data.predictedIncomeCompletion, 'd. MMM', { locale: cs })}`
                    : '✓ Cíl splněn!'}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
