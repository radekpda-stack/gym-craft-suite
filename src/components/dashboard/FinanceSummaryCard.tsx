import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus, Banknote, AlertCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FinanceMetrics, WeeklySummary } from '@/types/dashboard';
import { UnpaidTrainingsDialog } from './UnpaidTrainingsDialog';

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
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-success" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-destructive" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
};

export const FinanceSummaryCard = memo(function FinanceSummaryCard({
  finance,
  weeklySummary,
  isLoading
}: FinanceSummaryCardProps) {
  const [showUnpaidDialog, setShowUnpaidDialog] = useState(false);

  if (isLoading) {
    return (
      <Card variant="floating" className="overflow-hidden">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
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
    <>
      <Card variant="floating" className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg bg-success/10">
              <Banknote className="w-4 h-4 text-success" />
            </div>
            Finance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Two column layout for week/month */}
          <div className="grid grid-cols-2 gap-3">
            {/* Weekly Income */}
            <motion.div 
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="p-3 rounded-xl bg-card/60 backdrop-blur-sm border border-border/30"
            >
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                Tento týden
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold tabular-nums text-foreground">
                  {formatCurrency(weeklySummary.incomeThisWeek)}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <TrendIcon trend={weeklySummary.weekTrend} />
                <span className={cn(
                  'text-xs font-medium',
                  weeklySummary.weekTrend === 'up' ? 'text-success' : 
                  weeklySummary.weekTrend === 'down' ? 'text-destructive' : 'text-muted-foreground'
                )}>
                  {weeklyChange > 0 ? '+' : ''}{weeklyChange}%
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                vs. {formatCurrency(weeklySummary.incomeLastWeek)}
              </p>
            </motion.div>

            {/* Monthly Income */}
            <motion.div 
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className="p-3 rounded-xl bg-card/60 backdrop-blur-sm border border-border/30"
            >
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                Tento měsíc
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold tabular-nums text-foreground">
                  {formatCurrency(finance.monthlyIncome)}
                </span>
              </div>
              {finance.incomeChange !== 0 && (
                <div className="flex items-center gap-1 mt-1">
                  {finance.incomeChange > 0 ? (
                    <TrendingUp className="w-4 h-4 text-success" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  )}
                  <span className={cn(
                    'text-xs font-medium',
                    finance.incomeChange > 0 ? 'text-success' : 'text-destructive'
                  )}>
                    {finance.incomeChange > 0 ? '+' : ''}{finance.incomeChange}%
                  </span>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">
                ⌀ {formatCurrency(finance.avgPerTraining)} / trénink
              </p>
            </motion.div>
          </div>

          {/* Alerts row - only if issues exist */}
          {(hasUnpaid || hasCreditRisk) && (
            <motion.div 
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="p-3 rounded-xl bg-destructive/5 border border-destructive/20"
            >
              <div className="flex flex-wrap gap-3">
                {hasUnpaid && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent"
                    onClick={() => setShowUnpaidDialog(true)}
                  >
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-xs font-medium">
                        {finance.unpaidTotal.count} neuhrazených ({formatCurrency(finance.unpaidTotal.amount)})
                      </span>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </Button>
                )}
                {hasCreditRisk && (
                  <div className="flex items-center gap-2 text-warning">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">
                      {finance.creditAtRisk.count} v ohrožení ({formatCurrency(finance.creditAtRisk.amount)})
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      <UnpaidTrainingsDialog
        open={showUnpaidDialog}
        onOpenChange={setShowUnpaidDialog}
      />
    </>
  );
});
