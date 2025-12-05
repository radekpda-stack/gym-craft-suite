import { useState } from 'react';
import { Wallet, Loader2 } from 'lucide-react';
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
import { cn } from '@/lib/utils';

export type IncomePeriod = '30days' | '6months' | '12months' | 'lifetime';

interface IncomeDataPoint {
  label: string;
  payments: number;
  products: number;
}

interface IncomeChartProps {
  data: IncomeDataPoint[];
  isLoading?: boolean;
  period: IncomePeriod;
  onPeriodChange: (period: IncomePeriod) => void;
}

const PERIOD_OPTIONS: { value: IncomePeriod; label: string }[] = [
  { value: '30days', label: '30 dní' },
  { value: '6months', label: '6 měsíců' },
  { value: '12months', label: '12 měsíců' },
  { value: 'lifetime', label: 'Celkově' },
];

export function IncomeChart({ data, isLoading, period, onPeriodChange }: IncomeChartProps) {
  const totalIncome = data.reduce((sum, d) => sum + d.payments, 0);
  const isEmpty = data.length === 0 || totalIncome === 0;

  return (
    <div className="glass rounded-2xl p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-success/10">
            <Wallet className="w-4 h-4 text-success" />
          </div>
          <h3 className="text-base md:text-lg font-semibold text-foreground">
            Přehled příjmů
          </h3>
        </div>
        
        <div className="flex flex-wrap gap-1">
          {PERIOD_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={period === option.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onPeriodChange(option.value)}
              className={cn(
                "h-7 px-2.5 text-xs",
                period === option.value && "bg-primary text-primary-foreground"
              )}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="h-48 md:h-64">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : isEmpty ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Data nejsou k dispozici
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="incomeGradientNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="label" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={10} 
                tickMargin={8}
                interval={period === '30days' ? 4 : period === 'lifetime' ? 'preserveStartEnd' : 0}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={10} 
                width={50}
                tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${value.toLocaleString('cs-CZ')} Kč`, 'Platby']}
              />
              <Area
                type="monotone"
                dataKey="payments"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                fill="url(#incomeGradientNew)"
                name="Platby"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {!isLoading && !isEmpty && (
        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
          <span>
            Celkem: <strong className="text-foreground">{totalIncome.toLocaleString('cs-CZ')} Kč</strong>
          </span>
        </div>
      )}
    </div>
  );
}
