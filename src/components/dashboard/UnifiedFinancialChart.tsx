import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardFilters } from '@/contexts/DashboardFiltersContext';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatCurrency, formatPercent } from '@/lib/formatters';

export type FinancialPeriod = '30days' | '3months' | '6months' | '12months';
export type FinancialLayer = 'income' | 'costs' | 'profit' | 'all';

interface DataPoint {
  label: string;
  income: number;
  costs: number;
  profit: number;
}

interface UnifiedFinancialChartProps {
  data: DataPoint[];
  isLoading: boolean;
  period: FinancialPeriod;
  onPeriodChange: (period: FinancialPeriod) => void;
}

const PERIOD_OPTIONS: { value: FinancialPeriod; label: string }[] = [
  { value: '30days', label: '30 dní' },
  { value: '3months', label: '3 měs.' },
  { value: '6months', label: '6 měs.' },
  { value: '12months', label: '12 měs.' },
];

const LAYER_OPTIONS: { value: FinancialLayer; label: string; color: string }[] = [
  { value: 'all', label: 'Vše', color: '' },
  { value: 'income', label: 'Příjem', color: 'hsl(var(--success))' },
  { value: 'costs', label: 'Náklady', color: 'hsl(var(--destructive))' },
  { value: 'profit', label: 'Zisk', color: 'hsl(var(--primary))' },
];

export function UnifiedFinancialChart({
  data,
  isLoading,
  period,
  onPeriodChange,
}: UnifiedFinancialChartProps) {
  const [activeLayer, setActiveLayer] = useState<FinancialLayer>('all');
  const { filters } = useDashboardFilters();

  const summary = useMemo(() => {
    if (!data || data.length === 0) return null;

    const totalIncome = data.reduce((sum, d) => sum + d.income, 0);
    const totalCosts = data.reduce((sum, d) => sum + d.costs, 0);
    const totalProfit = data.reduce((sum, d) => sum + d.profit, 0);

    // Find best month
    const bestMonth = data.reduce(
      (best, d) => (d.profit > best.profit ? d : best),
      data[0]
    );

    // Calculate trend (compare last vs first half)
    const half = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, half).reduce((sum, d) => sum + d.profit, 0);
    const secondHalf = data.slice(half).reduce((sum, d) => sum + d.profit, 0);
    const trend = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;

    return {
      totalIncome,
      totalCosts,
      totalProfit,
      bestMonth: bestMonth.label,
      bestMonthValue: bestMonth.profit,
      trend,
    };
  }, [data]);

  const lastValue = data && data.length > 0 ? data[data.length - 1] : null;

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-4 sm:p-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg sm:text-xl font-bold text-foreground">
            Finanční přehled
          </h3>
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant={filters.accountingMode === 'cash' ? 'default' : 'secondary'}
                  className="text-xs cursor-help"
                >
                  {filters.accountingMode === 'cash' ? 'Hotovostní' : 'Akruální'}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  {filters.accountingMode === 'cash' 
                    ? 'Hotovostní: Počítáno podle data přijetí platby' 
                    : 'Akruální: Počítáno podle data poskytnutí služby'}
                </p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
        
        {/* Period filters - scrollable on mobile */}
        <div className="flex gap-1 p-1 rounded-full bg-secondary/50 overflow-x-auto scrollbar-hide">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={period === opt.value ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'rounded-full text-[10px] sm:text-xs px-2 sm:px-3 h-7 sm:h-8 flex-shrink-0',
                period === opt.value && 'bg-primary text-primary-foreground'
              )}
              onClick={() => onPeriodChange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Layer toggles - scrollable on mobile */}
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide pb-1">
        {LAYER_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={activeLayer === opt.value ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 flex-shrink-0',
              activeLayer === opt.value && opt.value !== 'all' && 'text-white'
            )}
            style={
              activeLayer === opt.value && opt.color
                ? { backgroundColor: opt.color, borderColor: opt.color }
                : undefined
            }
            onClick={() => setActiveLayer(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Last value highlight */}
      {lastValue && (
        <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 xs:gap-4 p-2.5 sm:p-3 rounded-xl bg-secondary/30">
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Poslední období</p>
            <p className="text-lg sm:text-xl font-bold text-foreground">
              {formatCurrency(lastValue.profit)}
            </p>
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground flex xs:flex-col gap-2 xs:gap-0">
            <p>Příjem: {formatCurrency(lastValue.income)}</p>
            <p>Náklady: {formatCurrency(lastValue.costs)}</p>
          </div>
        </div>
      )}

      {/* Chart */}
      {data && data.length > 0 ? (
        <div className="h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="costsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  padding: '8px 12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === 'income' ? 'Příjem' : name === 'costs' ? 'Náklady' : 'Zisk',
                ]}
              />
              {(activeLayer === 'all' || activeLayer === 'income') && (
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  fill="url(#incomeGradient)"
                  name="income"
                />
              )}
              {(activeLayer === 'all' || activeLayer === 'costs') && (
                <Area
                  type="monotone"
                  dataKey="costs"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  fill="url(#costsGradient)"
                  name="costs"
                />
              )}
              {(activeLayer === 'all' || activeLayer === 'profit') && (
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  fill="url(#profitGradient)"
                  name="profit"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-56 flex items-center justify-center text-muted-foreground">
          Žádná data k zobrazení
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/50">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Celkem za období</p>
            <p className="text-sm sm:text-base font-bold text-foreground">
              {formatCurrency(summary.totalProfit)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Nejlepší měsíc</p>
            <p className="text-sm sm:text-base font-bold text-success">{summary.bestMonth}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Trend</p>
            <div
              className={cn(
                'flex items-center justify-center gap-1 text-sm sm:text-base font-bold',
                summary.trend > 0 ? 'text-success' : summary.trend < 0 ? 'text-destructive' : 'text-muted-foreground'
              )}
            >
              {summary.trend > 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : summary.trend < 0 ? (
                <TrendingDown className="w-4 h-4" />
              ) : (
                <Minus className="w-4 h-4" />
              )}
              {formatPercent(Math.abs(summary.trend))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
