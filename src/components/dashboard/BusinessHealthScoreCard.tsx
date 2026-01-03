import { memo } from 'react';
import { Gauge, Settings, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useBusinessHealthScore } from '@/hooks/useBusinessHealthScore';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export const BusinessHealthScoreCard = memo(function BusinessHealthScoreCard() {
  const { data, isLoading } = useBusinessHealthScore();

  if (isLoading) {
    return (
      <Card className="glass">
        <CardContent className="p-4">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const statusColors = {
    excellent: 'text-success',
    good: 'text-primary',
    warning: 'text-warning',
    critical: 'text-destructive',
  };

  const statusBg = {
    excellent: 'from-success/10 to-success/5',
    good: 'from-primary/10 to-primary/5',
    warning: 'from-warning/10 to-warning/5',
    critical: 'from-destructive/10 to-destructive/5',
  };

  const statusLabels = {
    excellent: 'Výborný',
    good: 'Dobrý',
    warning: 'Vyžaduje pozornost',
    critical: 'Kritický',
  };

  return (
    <Card className={cn('overflow-hidden bg-gradient-to-br', statusBg[data.status])}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className={cn('w-5 h-5', statusColors[data.status])} />
            <span className="text-sm font-semibold">Business Health Score</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="space-y-2 text-xs">
                    <p className="font-medium">Jak se počítá kapacita:</p>
                    {data.capacityInfo && (
                      <div className="space-y-1 text-muted-foreground">
                        <p>• {data.capacityInfo.hoursPerDay.toFixed(1)}h denně</p>
                        <p>• {data.capacityInfo.workingDays} pracovních dní/měsíc</p>
                        <p>• Max. {data.capacityInfo.maxSlots} slotů/měsíc</p>
                        <p>• Využito: {data.capacityInfo.usedSlots} slotů</p>
                      </div>
                    )}
                    <Link 
                      to="/settings" 
                      className="flex items-center gap-1 text-primary hover:underline mt-2"
                    >
                      <Settings className="w-3 h-3" />
                      Upravit kapacitu
                    </Link>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', 
            data.status === 'excellent' && 'bg-success/20 text-success',
            data.status === 'good' && 'bg-primary/20 text-primary',
            data.status === 'warning' && 'bg-warning/20 text-warning',
            data.status === 'critical' && 'bg-destructive/20 text-destructive'
          )}>
            {statusLabels[data.status]}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className={cn('text-4xl font-bold', statusColors[data.status])}>
            {data.score}
          </div>
          <div className="flex-1">
            <Progress value={data.score} className="h-2" />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          {Object.entries(data.components).map(([key, comp]) => (
            <div key={key} className="p-1.5 rounded-lg bg-background/50">
              <div className="font-semibold">{comp.value}%</div>
              <div className="text-muted-foreground text-[10px] truncate">{comp.label}</div>
            </div>
          ))}
        </div>

        {data.insights.length > 0 && (
          <p className="text-xs text-muted-foreground">
            💡 {data.insights[0]}
          </p>
        )}
      </CardContent>
    </Card>
  );
});
