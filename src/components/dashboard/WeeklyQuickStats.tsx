import { memo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Calendar, Banknote, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { WeeklySummary } from '@/types/dashboard';

interface WeeklyQuickStatsProps {
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

const TrendBadge = ({ current, previous, suffix = '' }: { current: number; previous: number; suffix?: string }) => {
  if (previous === 0) return null;
  
  const change = Math.round(((current - previous) / previous) * 100);
  const isPositive = change > 0;
  const isNeutral = change === 0;
  
  return (
    <div className={cn(
      'flex items-center gap-1 text-xs font-medium',
      isPositive ? 'text-success' : isNeutral ? 'text-muted-foreground' : 'text-destructive'
    )}>
      {isPositive ? (
        <TrendingUp className="w-3 h-3" />
      ) : isNeutral ? (
        <Minus className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      <span>{isPositive ? '+' : ''}{change}%{suffix}</span>
    </div>
  );
};

export const WeeklyQuickStats = memo(function WeeklyQuickStats({
  weeklySummary,
  isLoading
}: WeeklyQuickStatsProps) {
  if (isLoading) {
    return (
      <Card variant="floating" className="overflow-hidden">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      icon: Calendar,
      value: weeklySummary.trainingsThisWeek,
      label: 'Tréninků',
      current: weeklySummary.trainingsThisWeek,
      previous: weeklySummary.trainingsLastWeek,
      color: 'primary',
    },
    {
      icon: Banknote,
      value: formatCurrency(weeklySummary.incomeThisWeek),
      label: 'Příjem',
      current: weeklySummary.incomeThisWeek,
      previous: weeklySummary.incomeLastWeek,
      color: 'success',
    },
    {
      icon: BarChart3,
      value: weeklySummary.weekTrend === 'up' ? 'Rostoucí' : weeklySummary.weekTrend === 'down' ? 'Klesající' : 'Stabilní',
      label: 'Trend',
      trend: weeklySummary.weekTrend,
      color: weeklySummary.weekTrend === 'up' ? 'success' : weeklySummary.weekTrend === 'down' ? 'destructive' : 'muted',
    },
  ];

  return (
    <Card variant="floating" className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Tento týden
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            vs. minulý týden
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className={cn(
                'relative p-3 rounded-xl',
                'bg-card/60 backdrop-blur-sm border border-border/30',
                'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5'
              )}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <stat.icon className={cn(
                  'w-4 h-4',
                  stat.color === 'success' ? 'text-success' :
                  stat.color === 'destructive' ? 'text-destructive' :
                  stat.color === 'primary' ? 'text-primary' : 'text-muted-foreground'
                )} />
              </div>
              
              <p className={cn(
                'text-lg sm:text-xl font-bold tabular-nums truncate',
                stat.trend === 'up' ? 'text-success' :
                stat.trend === 'down' ? 'text-destructive' : ''
              )}>
                {stat.value}
              </p>
              
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </span>
                {stat.current !== undefined && stat.previous !== undefined && (
                  <TrendBadge current={stat.current} previous={stat.previous} />
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
