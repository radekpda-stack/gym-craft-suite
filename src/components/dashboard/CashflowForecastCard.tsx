import { memo } from 'react';
import { Wallet, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCashflowForecast } from '@/hooks/useCashflowForecast';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export const CashflowForecastCard = memo(function CashflowForecastCard() {
  const { data, isLoading } = useCashflowForecast();

  if (isLoading) {
    return (
      <Card className="glass">
        <CardContent className="p-4">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const hasReceivables = data.receivables.total > 0;

  return (
    <Card className="glass">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold">Cashflow předpověď</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Calendar className="w-3 h-3" />
              Tento týden
            </div>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(data.thisWeek.expected, false)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {data.thisWeek.trainingsCount} tréninků
            </p>
          </div>

          <div className="p-3 rounded-xl bg-secondary/50">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Calendar className="w-3 h-3" />
              Příští týden
            </div>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(data.nextWeek.expected, false)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {data.nextWeek.trainingsCount} tréninků
            </p>
          </div>
        </div>

        {hasReceivables && (
          <div className="p-3 rounded-xl bg-warning/10 border border-warning/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-warning" />
                <span className="text-sm font-medium text-warning">Pohledávky</span>
              </div>
              <span className="font-bold text-warning">
                {formatCurrency(data.receivables.total, false)}
              </span>
            </div>
            <div className="flex gap-2 mt-2 text-[10px]">
              {data.receivables.byAge.days0to7.count > 0 && (
                <span className="text-muted-foreground">
                  0-7d: {formatCurrency(data.receivables.byAge.days0to7.amount, false)}
                </span>
              )}
              {data.receivables.byAge.days8to30.count > 0 && (
                <span className="text-warning">
                  8-30d: {formatCurrency(data.receivables.byAge.days8to30.amount, false)}
                </span>
              )}
              {data.receivables.byAge.days31plus.count > 0 && (
                <span className="text-destructive">
                  31+d: {formatCurrency(data.receivables.byAge.days31plus.amount, false)}
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
