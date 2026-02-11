import { useBusinessHealthMetrics } from '@/hooks/useBusinessHealthMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function HourlyRateTrendCard() {
  const { data: metrics, isLoading } = useBusinessHealthMetrics();

  if (isLoading) {
    return <Skeleton className="h-28 rounded-xl" />;
  }

  if (!metrics) return null;

  const change = metrics.hourlyRateChange;

  return (
    <Card className={cn(
      'bg-card/80 backdrop-blur-md border-border/50',
      'hover:shadow-md transition-all duration-200'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Hodinová sazba</p>
            <p className="text-2xl font-bold tabular-nums mt-1">{formatCurrency(metrics.currentHourlyRate)}</p>
            <div className="flex items-center gap-1 mt-1">
              {change > 0 ? (
                <TrendingUp className="h-3 w-3 text-muted-foreground" />
              ) : change < 0 ? (
                <TrendingDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <Minus className="h-3 w-3 text-muted-foreground" />
              )}
              <span className="text-[10px] text-muted-foreground">
                {change > 0 ? '+' : ''}{change}% vs minulý měsíc
              </span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Clock className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
