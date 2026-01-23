/**
 * WaterGoalWidget - displays water intake progress against daily goal
 */

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Droplets } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WaterGoalWidgetProps {
  /** Current water intake in ml */
  currentMl: number;
  /** Daily goal in ml */
  goalMl: number;
  /** Optional className */
  className?: string;
  /** Compact mode for smaller displays */
  compact?: boolean;
}

export function WaterGoalWidget({
  currentMl,
  goalMl,
  className,
  compact = false,
}: WaterGoalWidgetProps) {
  const percentage = useMemo(() => {
    if (goalMl <= 0) return 0;
    return Math.min(100, Math.round((currentMl / goalMl) * 100));
  }, [currentMl, goalMl]);

  const remaining = Math.max(0, goalMl - currentMl);
  const isComplete = currentMl >= goalMl;

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Droplets className={cn(
          'h-4 w-4',
          isComplete ? 'text-blue-500' : 'text-muted-foreground'
        )} />
        <div className="flex-1 min-w-0">
          <Progress 
            value={percentage} 
            className="h-2"
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {Math.round(currentMl / 1000 * 10) / 10}L / {goalMl / 1000}L
        </span>
      </div>
    );
  }

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          'p-2 rounded-lg',
          isComplete 
            ? 'bg-blue-500/20 text-blue-500' 
            : 'bg-muted text-muted-foreground'
        )}>
          <Droplets className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-sm">Voda dnes</h4>
          <p className="text-xs text-muted-foreground">
            {isComplete ? '✓ Cíl splněn!' : `Zbývá ${remaining}ml`}
          </p>
        </div>
        <div className="text-right">
          <span className={cn(
            'text-lg font-bold',
            isComplete ? 'text-blue-500' : ''
          )}>
            {percentage}%
          </span>
        </div>
      </div>

      <Progress value={percentage} className="h-3 mb-2" />

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{currentMl}ml</span>
        <span>Cíl: {goalMl}ml</span>
      </div>
    </Card>
  );
}

/**
 * Calculate daily water totals from drink entries
 */
export function calculateDailyWaterIntake(
  drinkEntries: Array<{ drink_type: string; amount_ml?: number | null }>
): number {
  return drinkEntries
    .filter(entry => entry.drink_type === 'water')
    .reduce((sum, entry) => sum + (entry.amount_ml || 0), 0);
}
