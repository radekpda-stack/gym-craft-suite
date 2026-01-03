import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, Banknote, AlertCircle, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FinanceMetrics, WeeklySummary } from '@/types/dashboard';

interface FinanceSummaryCardProps {
  finance: FinanceMetrics;
  weeklySummary: WeeklySummary;
  isLoading?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('cs-CZ', { 
    style: 'currency', 
    currency: 'CZK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0 
  }).format(value);
};

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
  if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5 text-success" />;
  if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-destructive" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
};

export const FinanceSummaryCard = memo(function FinanceSummaryCard({
  finance,
  weeklySummary,
  isLoading
}: FinanceSummaryCardProps) {
  if (isLoading) {
    return (
      <Card className="glass">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const weeklyChange = weeklySummary.incomeLastWeek > 0
    ? Math.round(((weeklySummary.incomeThisWeek - weeklySummary.incomeLastWeek) / weeklySummary.incomeLastWeek) * 100)
    : 0;

  const hasUnpaid = finance.unpaidTotal.count > 0;
  const hasCreditRisk = finance.creditAtRisk.count > 0;

  return (
    <Card className="glass overflow-hidden">
      <CardContent className="p-0">
        <div className="grid grid-cols-2 divide-x divide-border/50">
          {/* Weekly Income */}
          <div className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tento týden
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-bold text-foreground">
                {formatCurrency(weeklySummary.incomeThisWeek)}
              </span>
              <div className="flex items-center gap-0.5">
                <TrendIcon trend={weeklySummary.weekTrend} />
                <span className={cn(
                  'text-[10px] sm:text-xs font-medium',
                  weeklySummary.weekTrend === 'up' ? 'text-success' : 
                  weeklySummary.weekTrend === 'down' ? 'text-destructive' : 'text-muted-foreground'
                )}>
                  {weeklyChange > 0 ? '+' : ''}{weeklyChange}%
                </span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              vs. {formatCurrency(weeklySummary.incomeLastWeek)} minulý týden
            </p>
          </div>

          {/* Monthly Income */}
          <div className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Banknote className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tento měsíc
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-bold text-foreground">
                {formatCurrency(finance.monthlyIncome)}
              </span>
              {finance.incomeChange !== 0 && (
                <span className={cn(
                  'text-[10px] sm:text-xs font-medium',
                  finance.incomeChange > 0 ? 'text-success' : 'text-destructive'
                )}>
                  {finance.incomeChange > 0 ? '+' : ''}{finance.incomeChange}%
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              ⌀ {formatCurrency(finance.avgPerTraining)} / trénink
            </p>
          </div>
        </div>

        {/* Alerts row */}
        {(hasUnpaid || hasCreditRisk) && (
          <div className="border-t border-border/50 px-3 sm:px-4 py-2 flex flex-wrap gap-3 sm:gap-4 bg-destructive/5">
            {hasUnpaid && (
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                <span className="text-xs text-destructive font-medium">
                  {finance.unpaidTotal.count} neuhrazených ({formatCurrency(finance.unpaidTotal.amount)})
                </span>
              </div>
            )}
            {hasCreditRisk && (
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-warning" />
                <span className="text-xs text-warning font-medium">
                  {finance.creditAtRisk.count} v ohrožení ({formatCurrency(finance.creditAtRisk.amount)})
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
