import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Loader2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';

export type ProfitPeriod = '30days' | '6months' | '12months';

export interface ProfitDataPoint {
  label: string;
  revenue: number;
  costs: number;
  profit: number;
}

interface ProfitChartProps {
  data: ProfitDataPoint[];
  isLoading: boolean;
  period: ProfitPeriod;
  onPeriodChange: (period: ProfitPeriod) => void;
}

const PERIOD_OPTIONS: { value: ProfitPeriod; label: string }[] = [
  { value: '30days', label: '30 dní' },
  { value: '6months', label: '6 měsíců' },
  { value: '12months', label: '12 měsíců' },
];

export function ProfitChart({ data, isLoading, period, onPeriodChange }: ProfitChartProps) {
  // Memoize computed totals
  const { totalRevenue, totalCosts, totalProfit } = useMemo(() => ({
    totalRevenue: data.reduce((sum, d) => sum + d.revenue, 0),
    totalCosts: data.reduce((sum, d) => sum + d.costs, 0),
    totalProfit: data.reduce((sum, d) => sum + d.profit, 0),
  }), [data]);

  return (
    <div className="glass rounded-2xl p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-success/10">
            <TrendingUp className="w-4 h-4 text-success" />
          </div>
          <h3 className="text-base md:text-lg font-semibold text-foreground">
            Čistý zisk z produktů
          </h3>
        </div>
        <div className="flex gap-1">
          {PERIOD_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={period === option.value ? 'default' : 'ghost'}
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => onPeriodChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-48 md:h-64 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : data.length === 0 ? (
        <div className="h-48 md:h-64 flex items-center justify-center text-muted-foreground text-sm">
          Žádná data za toto období
        </div>
      ) : (
        <>
          <div className="h-48 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickMargin={8}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  width={45}
                  tickFormatter={(value) => `${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'profit' ? 'Zisk' : name === 'revenue' ? 'Tržby' : 'Náklady',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={1}
                  fill="url(#revenueGradient)"
                  name="revenue"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  fill="url(#profitGradient)"
                  name="profit"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Tržby</p>
              <p className="text-sm md:text-base font-bold text-foreground">
                {formatCurrency(totalRevenue)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Náklady</p>
              <p className="text-sm md:text-base font-bold text-warning">
                {formatCurrency(totalCosts)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Čistý zisk</p>
              <p className="text-sm md:text-base font-bold text-success">
                {formatCurrency(totalProfit)}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
