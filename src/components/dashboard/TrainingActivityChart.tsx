import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Dumbbell, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import { useDashboardFilters } from '@/contexts/DashboardFiltersContext';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type TrainingPeriod = '30days' | '6months' | '12months';
export type TrainingMetric = 'monthly' | 'weeklyAvg' | 'trend';

interface TrainingDataPoint {
  label: string;
  count: number;
  weeklyAvg?: number;
}

interface TrainingActivityChartProps {
  data: TrainingDataPoint[];
  isLoading: boolean;
  period: TrainingPeriod;
  onPeriodChange: (period: TrainingPeriod) => void;
}

const PERIOD_OPTIONS: { value: TrainingPeriod; label: string }[] = [
  { value: '30days', label: '30 dní' },
  { value: '6months', label: '6 měs.' },
  { value: '12months', label: '12 měs.' },
];

const METRIC_OPTIONS: { value: TrainingMetric; label: string; icon: any }[] = [
  { value: 'monthly', label: 'Měsíčně', icon: Calendar },
  { value: 'weeklyAvg', label: 'Týdenní Ø', icon: Dumbbell },
  { value: 'trend', label: 'Trend', icon: TrendingUp },
];

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  all: 'Vše',
  paid: 'Zaplaceno',
  unpaid: 'Nezaplaceno',
  overdue: 'Po splatnosti',
};

// Simple linear regression for trend line
function calculateTrendLine(data: TrainingDataPoint[]): TrainingDataPoint[] {
  if (data.length < 2) return data;
  
  const n = data.length;
  const sumX = data.reduce((sum, _, i) => sum + i, 0);
  const sumY = data.reduce((sum, d) => sum + d.count, 0);
  const sumXY = data.reduce((sum, d, i) => sum + i * d.count, 0);
  const sumXX = data.reduce((sum, _, i) => sum + i * i, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return data.map((d, i) => ({
    ...d,
    trend: Math.max(0, intercept + slope * i),
  }));
}

export function TrainingActivityChart({
  data,
  isLoading,
  period,
  onPeriodChange,
}: TrainingActivityChartProps) {
  const [metric, setMetric] = useState<TrainingMetric>('monthly');
  const { filters } = useDashboardFilters();

  const chartData = useMemo(() => {
    if (metric === 'trend') {
      return calculateTrendLine(data);
    }
    return data;
  }, [data, metric]);

  const summary = useMemo(() => {
    if (!data || data.length === 0) return null;

    const total = data.reduce((sum, d) => sum + d.count, 0);
    const average = Math.round(total / data.length);
    const maxMonth = data.reduce((max, d) => (d.count > max.count ? d : max), data[0]);
    
    // Calculate trend direction
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.count, 0) / (firstHalf.length || 1);
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.count, 0) / (secondHalf.length || 1);
    const trendPercent = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

    return {
      total,
      average,
      mostActive: maxMonth.label,
      mostActiveCount: maxMonth.count,
      trendPercent: Math.round(trendPercent),
      trendDirection: trendPercent > 5 ? 'up' : trendPercent < -5 ? 'down' : 'stable',
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-4 sm:p-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg sm:text-xl font-bold text-foreground">
            Tréninková aktivita
          </h3>
          {filters.clientIds.length > 0 && (
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs">
                    {filters.clientIds.length} klient{filters.clientIds.length > 1 ? 'ů' : ''}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Filtrováno podle vybraných klientů</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          )}
          {filters.paymentStatus !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              {PAYMENT_STATUS_LABELS[filters.paymentStatus]}
            </Badge>
          )}
        </div>
        
        <div className="flex gap-1 p-1 rounded-full bg-secondary/50">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={period === opt.value ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'rounded-full text-xs px-3 h-8',
                period === opt.value && 'bg-primary text-primary-foreground'
              )}
              onClick={() => onPeriodChange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Metric toggles */}
      <div className="flex gap-2 flex-wrap">
        {METRIC_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          return (
            <Button
              key={opt.value}
              variant={metric === opt.value ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-8 gap-1.5"
              onClick={() => setMetric(opt.value)}
            >
              <Icon className="w-3.5 h-3.5" />
              {opt.label}
            </Button>
          );
        })}
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <div className="h-48 sm:h-56">
          <ResponsiveContainer width="100%" height="100%">
            {metric === 'trend' ? (
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1}
                  dot={{ r: 3, fill: 'hsl(var(--muted-foreground))' }}
                  name="Skutečnost"
                />
                <Line
                  type="monotone"
                  dataKey="trend"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Trend"
                />
              </LineChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="trainingGradient" x1="0" y1="0" x2="0" y2="1">
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
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                  }}
                  formatter={(value: number, name: string) => [
                    value,
                    metric === 'weeklyAvg' ? 'Týdenní Ø' : 'Tréninků',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey={metric === 'weeklyAvg' ? 'weeklyAvg' : 'count'}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#trainingGradient)"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-48 flex items-center justify-center text-muted-foreground">
          Žádná data k zobrazení
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/50">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Celkem</p>
            <p className="text-sm sm:text-base font-bold text-foreground">{summary.total}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Průměr/měsíc</p>
            <p className="text-sm sm:text-base font-bold text-foreground">{summary.average}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Nejaktivnější</p>
            <div className="flex items-center justify-center gap-1">
              <p className="text-sm sm:text-base font-bold text-primary truncate max-w-[80px]">
                {summary.mostActive}
              </p>
              {summary.trendDirection === 'up' && (
                <TrendingUp className="w-3.5 h-3.5 text-success flex-shrink-0" />
              )}
              {summary.trendDirection === 'down' && (
                <TrendingDown className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
              )}
              {summary.trendDirection === 'stable' && (
                <Minus className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
