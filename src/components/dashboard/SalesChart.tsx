import { useState, useMemo } from 'react';
import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChartSkeleton } from '@/components/ui/chart-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useSalesStats, useSalesTrend, SalesPeriod } from '@/hooks/useSalesStats';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';

const PAYMENT_COLORS = {
  cash: 'hsl(var(--success))',
  credit: 'hsl(var(--primary))',
  card: 'hsl(var(--warning))',
};

const PAYMENT_LABELS = {
  cash: 'Hotově',
  credit: 'Z kreditu',
  card: 'Kartou',
};

export function SalesChart() {
  const [period, setPeriod] = useState<SalesPeriod>('30days');
  const { data: stats, isLoading: statsLoading } = useSalesStats();
  const { data: trendData = [], isLoading: trendLoading } = useSalesTrend(period);

  const isLoading = statsLoading || trendLoading;

  const pieData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: PAYMENT_LABELS.cash, value: stats.byPaymentMethod.cash, color: PAYMENT_COLORS.cash },
      { name: PAYMENT_LABELS.credit, value: stats.byPaymentMethod.credit, color: PAYMENT_COLORS.credit },
      { name: PAYMENT_LABELS.card, value: stats.byPaymentMethod.card, color: PAYMENT_COLORS.card },
    ].filter(item => item.value > 0);
  }, [stats]);

  return (
    <div className="glass rounded-2xl p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10">
            <ShoppingBag className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-foreground">
              Prodeje produktů
            </h3>
            <p className="text-sm text-muted-foreground">
              Obrat: {formatCurrency(stats?.totalRevenue || 0)} ({stats?.totalSales || 0} prodejů)
            </p>
          </div>
        </div>
        <div className="flex gap-1 flex-wrap">
          {(['30days', '6months', '12months', 'all'] as SalesPeriod[]).map((p) => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriod(p)}
              className="text-xs"
            >
              {p === '30days' ? '30 dní' : p === '6months' ? '6 měsíců' : p === '12months' ? '12 měsíců' : 'Vše'}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <ChartSkeleton showHeader={false} showSummary={false} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Trend Chart */}
          <div className="lg:col-span-2 h-48 md:h-64">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickMargin={8}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    width={50}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Tržby']}
                    labelFormatter={(label) => `Období: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    fill="url(#salesGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Žádné prodeje v tomto období
              </div>
            )}
          </div>

          {/* Payment Method Breakdown */}
          <div className="h-48 md:h-64">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [formatCurrency(value)]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => (
                      <span className="text-xs text-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <ShoppingBag className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-sm">Žádné prodeje tento měsíc</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment method stats cards */}
      {stats && stats.totalSales > 0 && (
        <div className="grid grid-cols-3 gap-2 md:gap-4 pt-2 border-t border-border/50">
          <div className="text-center p-2 md:p-3 rounded-xl bg-success/10">
            <p className="text-xs text-muted-foreground">Hotově</p>
            <p className="text-sm md:text-lg font-bold text-success">
              {formatCurrency(stats.byPaymentMethod.cash)}
            </p>
            <p className="text-xs text-muted-foreground">{stats.countByPaymentMethod.cash}×</p>
          </div>
          <div className="text-center p-2 md:p-3 rounded-xl bg-primary/10">
            <p className="text-xs text-muted-foreground">Z kreditu</p>
            <p className="text-sm md:text-lg font-bold text-primary">
              {formatCurrency(stats.byPaymentMethod.credit)}
            </p>
            <p className="text-xs text-muted-foreground">{stats.countByPaymentMethod.credit}×</p>
          </div>
          <div className="text-center p-2 md:p-3 rounded-xl bg-warning/10">
            <p className="text-xs text-muted-foreground">Kartou</p>
            <p className="text-sm md:text-lg font-bold text-warning">
              {formatCurrency(stats.byPaymentMethod.card)}
            </p>
            <p className="text-xs text-muted-foreground">{stats.countByPaymentMethod.card}×</p>
          </div>
        </div>
      )}
    </div>
  );
}
