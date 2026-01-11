import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { MonthlyExpenseTrend } from '@/hooks/useExpenseStats';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(amount);
}

interface ExpenseTrendChartProps {
  data: MonthlyExpenseTrend[];
}

export function ExpenseTrendChart({ data }: ExpenseTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        Žádná data k zobrazení
      </div>
    );
  }

  const maxAmount = Math.max(...data.map(d => d.amount));
  const average = data.reduce((sum, d) => sum + d.amount, 0) / data.length;

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
          <XAxis 
            dataKey="label" 
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${Math.round(value / 1000)}k`}
            width={40}
          />
          <Tooltip
            formatter={(value: number) => [formatCurrency(value), 'Náklady']}
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              borderColor: 'hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="hsl(var(--destructive))"
            fill="url(#expenseGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex justify-center gap-6 text-sm">
        <div className="text-center">
          <div className="text-muted-foreground">Průměr</div>
          <div className="font-semibold">{formatCurrency(average)}</div>
        </div>
        <div className="text-center">
          <div className="text-muted-foreground">Maximum</div>
          <div className="font-semibold">{formatCurrency(maxAmount)}</div>
        </div>
      </div>
    </div>
  );
}
