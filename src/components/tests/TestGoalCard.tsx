import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Target, Edit2, Trash2, Check, CalendarIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { useTestGoal, useCreateTestGoal, useDeleteTestGoal } from '@/hooks/useTestGoals';
import type { TestDefinition, TestSession } from '@/types/tests';
import { formatDuration } from '@/lib/utils';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface TestGoalCardProps {
  definition: TestDefinition;
  clientId: string;
  currentValue: number | null;
  prValue: number | null;
}

export function TestGoalCard({ definition, clientId, currentValue, prValue }: TestGoalCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [targetValue, setTargetValue] = useState<string>('');
  const [targetDate, setTargetDate] = useState<Date | undefined>();
  
  const { data: goal, isLoading } = useTestGoal(clientId, definition.id);
  const createGoal = useCreateTestGoal();
  const deleteGoal = useDeleteTestGoal();
  
  const isBetterLower = definition.primary_metric_better === 'lower_is_better';
  const isTimeMetric = definition.primary_metric_key.includes('time') || definition.primary_metric_key === 'time_s';
  
  const formatValue = (value: number) => {
    if (isTimeMetric) return formatDuration(value);
    if (definition.primary_metric_key.includes('pct')) return `${value.toFixed(1)}%`;
    return value.toFixed(2);
  };
  
  const calculateProgress = () => {
    if (!goal || currentValue === null) return 0;
    const target = goal.target_value;
    const start = prValue || currentValue;
    
    if (isBetterLower) {
      // Lower is better - progress is how much we've improved toward the target
      if (start <= target) return 100; // Already at or better than goal
      const totalImprovement = start - target;
      const currentImprovement = start - currentValue;
      return Math.min(100, Math.max(0, (currentImprovement / totalImprovement) * 100));
    } else {
      // Higher is better
      if (start >= target) return 100;
      const totalImprovement = target - start;
      const currentImprovement = currentValue - start;
      return Math.min(100, Math.max(0, (currentImprovement / totalImprovement) * 100));
    }
  };
  
  const isAchieved = () => {
    if (!goal || currentValue === null) return false;
    if (isBetterLower) {
      return currentValue <= goal.target_value;
    }
    return currentValue >= goal.target_value;
  };
  
  const handleSave = async () => {
    const value = parseFloat(targetValue);
    if (isNaN(value)) return;
    
    await createGoal.mutateAsync({
      client_id: clientId,
      test_definition_id: definition.id,
      target_value: value,
      target_date: targetDate ? format(targetDate, 'yyyy-MM-dd') : null,
    });
    setIsEditing(false);
  };
  
  const handleDelete = async () => {
    if (goal) {
      await deleteGoal.mutateAsync(goal.id);
    }
  };
  
  const progress = calculateProgress();
  const achieved = isAchieved();
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-2 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!goal && !isEditing) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4">
          <Button
            variant="ghost"
            className="w-full h-full flex items-center justify-center gap-2 text-muted-foreground"
            onClick={() => {
              setIsEditing(true);
              // Pre-fill with suggested target
              if (currentValue !== null) {
                const suggested = isBetterLower 
                  ? currentValue * 0.95 // 5% improvement
                  : currentValue * 1.05;
                setTargetValue(suggested.toString());
              }
            }}
          >
            <Target className="w-4 h-4" />
            Nastavit cíl
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  if (isEditing) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4" />
            Nastavit cíl
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Cílová hodnota {isTimeMetric && '(sekundy)'}</Label>
            <Input
              type="number"
              value={targetValue}
              onChange={e => setTargetValue(e.target.value)}
              placeholder={currentValue ? `Aktuální: ${formatValue(currentValue)}` : 'Zadejte cíl'}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Cílové datum (volitelné)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {targetDate ? format(targetDate, 'PPP', { locale: cs }) : 'Vyberte datum'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={targetDate}
                  onSelect={setTargetDate}
                  locale={cs}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!targetValue || createGoal.isPending} className="flex-1">
              <Check className="w-4 h-4 mr-1" />
              Uložit
            </Button>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Zrušit
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={achieved ? 'border-success/50 bg-success/5' : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className={`w-4 h-4 ${achieved ? 'text-success' : 'text-primary'}`} />
            Cíl
            {achieved && <Badge className="bg-success text-success-foreground">Dosaženo!</Badge>}
          </CardTitle>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
              setTargetValue(goal!.target_value.toString());
              setTargetDate(goal?.target_date ? new Date(goal.target_date) : undefined);
              setIsEditing(true);
            }}>
              <Edit2 className="w-3 h-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={handleDelete}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Cíl:</span>
          <span className="font-semibold">{formatValue(goal!.target_value)}</span>
        </div>
        
        {currentValue !== null && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Aktuální:</span>
            <span className="font-medium">{formatValue(currentValue)}</span>
          </div>
        )}
        
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progres</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        {goal!.target_date && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarIcon className="w-3 h-3" />
            <span>Do {format(new Date(goal!.target_date), 'PPP', { locale: cs })}</span>
          </div>
        )}
        
        {currentValue !== null && (
          <div className="flex items-center gap-2 text-xs">
            {isBetterLower ? (
              currentValue > goal!.target_value ? (
                <>
                  <TrendingDown className="w-3 h-3 text-primary" />
                  <span>Zbývá zlepšit o {formatValue(currentValue - goal!.target_value)}</span>
                </>
              ) : (
                <>
                  <Check className="w-3 h-3 text-success" />
                  <span className="text-success">Lepší o {formatValue(goal!.target_value - currentValue)}</span>
                </>
              )
            ) : (
              currentValue < goal!.target_value ? (
                <>
                  <TrendingUp className="w-3 h-3 text-primary" />
                  <span>Zbývá zlepšit o {formatValue(goal!.target_value - currentValue)}</span>
                </>
              ) : (
                <>
                  <Check className="w-3 h-3 text-success" />
                  <span className="text-success">Lepší o {formatValue(currentValue - goal!.target_value)}</span>
                </>
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
