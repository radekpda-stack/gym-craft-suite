import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  useFinanceAnalytics, 
  FinancePeriodType,
} from '@/hooks/useFinanceAnalytics';
import { formatCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { HelpCircle, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from 'recharts';
import type { StatsPeriodRange } from './StatsPeriodSelector';
import { differenceInDays } from 'date-fns';
import { useMemo } from 'react';


interface FinanceChartsSectionProps {
  periodRange?: StatsPeriodRange;
}

export function FinanceChartsSection({ periodRange }: FinanceChartsSectionProps) {
  // Convert periodRange to FinancePeriodType
  const periodType = useMemo<FinancePeriodType>(() => {
    if (!periodRange) return 'month';
    
    const days = differenceInDays(periodRange.end, periodRange.start);
    if (days <= 31) return 'month';
    if (days <= 100) return '90days';
    return 'year';
  }, [periodRange]);

  const { data, isLoading } = useFinanceAnalytics({
    periodType,
    selectedClientIds: [],
    comparisonMode: 'history',
  });

  // Prepare chart data
  const trendData = data?.trend.map(item => ({
    label: item.label,
    value: item.value,
  })) || [];


  // Calculate period comparison percentages
  const getChangePercent = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const totalChange = data?.previousPeriod 
    ? getChangePercent(data.totalIncome, data.previousPeriod.totalIncome) 
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[300px] rounded-xl" />
        <Skeleton className="h-[250px] rounded-xl" />
      </div>
    );
  }

  if (!data || trendData.length === 0) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4">
        {/* Period label - no toggle, uses global periodRange */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">
            Trend a rozložení
            {periodRange && (
              <span className="ml-2 text-xs">({periodRange.label})</span>
            )}
          </h3>
        </div>

        {/* Trend Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-medium">Trend příjmů</CardTitle>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-sm">
                      Graf zobrazuje celkový příjem (tréninky + produkty) po jednotlivých dnech za vybrané období. 
                    </p>
                  </TooltipContent>
                </UITooltip>
              </div>
              {data.previousPeriod && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  {totalChange >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{totalChange >= 0 ? '+' : ''}{totalChange.toFixed(0)}%</span>
                  <span className="text-xs">vs předchozí</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorIncomeTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="label" 
                  className="text-xs fill-muted-foreground" 
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  className="text-xs fill-muted-foreground"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => value >= 1000 ? `${Math.round(value/1000)}k` : value}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                          <p className="text-sm font-medium">{formatCurrency(payload[0].value as number)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  fillOpacity={1} 
                  fill="url(#colorIncomeTrend)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribution donut removed - data already shown in ProfitLossCard and FinanceHeroKPI */}
      </div>
    </TooltipProvider>
  );
}
