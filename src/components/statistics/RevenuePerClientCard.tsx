import { useBusinessHealthMetrics } from '@/hooks/useBusinessHealthMetrics';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function RevenuePerClientCard() {
  const { data: metrics, isLoading } = useBusinessHealthMetrics();

  if (isLoading) {
    return <Skeleton className="h-28 rounded-xl" />;
  }

  if (!metrics) return null;

  const change = metrics.revenuePerClientChange;

  return (
    <Card className="bg-card/80 backdrop-blur-md border-border/50 hover:shadow-md transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Příjem / klient</p>
            <p className="text-2xl font-bold tabular-nums mt-1">{formatCurrency(metrics.revenuePerClient)}</p>
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
            <Users className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
