import { memo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Target, Calendar, Gauge, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useRevenueForecast } from '@/hooks/useRevenueForecast';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export const NextMonthForecastCard = memo(function NextMonthForecastCard() {
  const { data, isLoading } = useRevenueForecast();

  if (isLoading) {
    return (
      <Card variant="floating" className="overflow-hidden">
        <CardContent className="p-4">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { nextMonthForecast, trendDirection, breakEvenTrainings, avgMonthlyExpenses } = data;
  const { expected, low, high, confidence, trainingsEstimate, vsLastMonth, label } = nextMonthForecast;

  const TrendIcon = trendDirection === 'up' ? TrendingUp : trendDirection === 'down' ? TrendingDown : Minus;
  const trendColor = trendDirection === 'up' ? 'text-success' : trendDirection === 'down' ? 'text-destructive' : 'text-muted-foreground';
  const trendBg = trendDirection === 'up' ? 'bg-success/10' : trendDirection === 'down' ? 'bg-destructive/10' : 'bg-muted/30';

  // Profit estimate
  const estimatedProfit = expected - avgMonthlyExpenses;
  const isProfitable = estimatedProfit > 0;

  return (
    <Card variant="floating" className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Predikce – {label}
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Na základě vašich posledních 12 měsíců
              </p>
            </div>
          </div>
          <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', trendBg, trendColor)}>
            <TrendIcon className="w-3 h-3" />
            {vsLastMonth > 0 ? '+' : ''}{vsLastMonth}%
          </div>
        </div>

        {/* Main forecast */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="p-4 rounded-xl bg-primary/5 border border-primary/15"
        >
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {formatCurrency(expected, false)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Rozsah: {formatCurrency(low, false)} – {formatCurrency(high, false)}
            </p>
          </div>

          {/* Confidence bar */}
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground flex items-center gap-1">
                <Gauge className="w-3 h-3" />
                Spolehlivost predikce
              </span>
              <span className={cn(
                'font-semibold',
                confidence >= 70 ? 'text-success' : confidence >= 40 ? 'text-warning' : 'text-destructive'
              )}>
                {confidence}%
              </span>
            </div>
            <Progress 
              value={confidence} 
              className="h-1.5" 
            />
          </div>
        </motion.div>

        {/* Details row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-xl bg-card/60 border border-border/30 text-center">
            <Calendar className="w-3.5 h-3.5 mx-auto mb-1 text-primary" />
            <p className="text-sm font-bold tabular-nums">{trainingsEstimate}</p>
            <p className="text-[9px] text-muted-foreground">Odhad tréninků</p>
          </div>
          <div className="p-2.5 rounded-xl bg-card/60 border border-border/30 text-center">
            <ArrowRight className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-sm font-bold tabular-nums">{breakEvenTrainings}</p>
            <p className="text-[9px] text-muted-foreground">Break-even</p>
          </div>
          <div className={cn(
            "p-2.5 rounded-xl text-center border",
            isProfitable 
              ? "bg-success/5 border-success/15" 
              : "bg-destructive/5 border-destructive/15"
          )}>
            <TrendingUp className={cn("w-3.5 h-3.5 mx-auto mb-1", isProfitable ? "text-success" : "text-destructive")} />
            <p className={cn("text-sm font-bold tabular-nums", isProfitable ? "text-success" : "text-destructive")}>
              {formatCurrency(estimatedProfit, false)}
            </p>
            <p className="text-[9px] text-muted-foreground">Odhad zisku</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
