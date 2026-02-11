import { useRevenueForecast } from '@/hooks/useRevenueForecast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { TrendingUp, Target, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';

export function RevenueForecastCard() {
  const { data, isLoading } = useRevenueForecast();

  if (isLoading) {
    return <Skeleton className="h-80 rounded-xl" />;
  }

  if (!data) return null;

  const chartData = data.points.map(p => ({
    label: p.label,
    revenue: p.revenue || undefined,
    forecast: p.forecast || undefined,
    expenses: p.expenses || undefined,
  }));

  return (
    <Card className="bg-card/80 backdrop-blur-md border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          Predikce příjmu
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary KPIs */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10 text-center">
            <Target className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
            <p className="text-xs font-bold tabular-nums">{formatCurrency(data.annualProjection)}</p>
            <p className="text-[9px] text-muted-foreground">Roční projekce</p>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 text-center">
            <Calculator className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
            <p className="text-xs font-bold tabular-nums">{data.breakEvenTrainings}/měs</p>
            <p className="text-[9px] text-muted-foreground">Break-even</p>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 text-center">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
            <p className="text-xs font-bold tabular-nums">{formatCurrency(data.avgMonthlyRevenue)}</p>
            <p className="text-[9px] text-muted-foreground">Ø měsíčně</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fcGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" width={45} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                formatter={(value: number, name: string) => [formatCurrency(value), name === 'revenue' ? 'Příjem' : name === 'forecast' ? 'Predikce' : 'Náklady']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                fill="url(#revGrad)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Area
                type="monotone"
                dataKey="forecast"
                stroke="hsl(var(--accent))"
                fill="url(#fcGrad)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="hsl(var(--destructive))"
                fill="none"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-primary rounded-full" />
            <span className="text-[10px] text-muted-foreground">Příjem</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-accent rounded-full border-dashed" style={{ borderTop: '1px dashed' }} />
            <span className="text-[10px] text-muted-foreground">Predikce</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-destructive/50 rounded-full" />
            <span className="text-[10px] text-muted-foreground">Náklady</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
