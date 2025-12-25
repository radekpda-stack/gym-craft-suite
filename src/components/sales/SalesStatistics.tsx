import { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  ShoppingCart, 
  Banknote, 
  Package,
  Calendar,
  Loader2,
  Trophy,
  BarChart3,
  CreditCard,
  Building,
  Wallet,
  RefreshCw
} from 'lucide-react';
import { format, subDays, subMonths, startOfDay, startOfMonth, isWithinInterval } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Cell
} from 'recharts';
import { useSalesStats, useSalesTrend } from '@/hooks/useSalesOrders';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

type Period = 'today' | 'week' | 'month' | 'year';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Dnes' },
  { value: 'week', label: 'Tento týden' },
  { value: 'month', label: 'Tento měsíc' },
  { value: 'year', label: 'Tento rok' },
];

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const PAYMENT_METHOD_LABELS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  cash: { label: 'Hotově', icon: Banknote },
  card: { label: 'Kartou', icon: CreditCard },
  bank: { label: 'Převodem', icon: Building },
  credit: { label: 'Kreditem', icon: Wallet },
};

export function SalesStatistics() {
  const [period, setPeriod] = useState<Period>('month');
  
  const periodRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'today':
        return { start: startOfDay(now), end: now };
      case 'week':
        return { start: subDays(now, 7), end: now };
      case 'month':
        return { start: startOfMonth(now), end: now };
      case 'year':
        return { start: subMonths(now, 12), end: now };
    }
  }, [period]);

  const { data: stats, isLoading: statsLoading } = useSalesStats(period);
  const trendPeriod = period === 'today' ? 'week' : period;
  const { data: trendData = [], isLoading: trendLoading } = useSalesTrend(trendPeriod as 'week' | 'month' | 'year');

  // Format trend data for chart
  const chartData = useMemo(() => {
    return trendData.map(item => ({
      ...item,
      label: period === 'year' 
        ? format(new Date(item.date + '-01'), 'MMM', { locale: cs })
        : format(new Date(item.date), 'd.M.', { locale: cs }),
    }));
  }, [trendData, period]);

  // Pie chart data for payment methods
  const paymentMethodPieData = useMemo(() => {
    if (!stats?.byPaymentMethod) return [];
    return Object.entries(stats.byPaymentMethod)
      .filter(([_, data]) => (data as { revenue: number }).revenue > 0)
      .map(([method, data]) => ({
        name: PAYMENT_METHOD_LABELS[method]?.label || method,
        value: (data as { revenue: number }).revenue,
      }));
  }, [stats]);

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Period Filter */}
      <div className="flex items-center gap-3">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">Tržby za období</span>
          </div>
          <p className="text-2xl font-bold text-primary">{formatCurrency(stats?.totalRevenue || 0)}</p>
          <p className="text-xs text-muted-foreground mt-1">{PERIODS.find(p => p.value === period)?.label}</p>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <ShoppingCart className="w-4 h-4" />
            <span className="text-xs">Počet prodejů</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats?.totalOrders || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">za období</p>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-xs">Nejprodávanější</span>
          </div>
          {stats?.topProducts?.[0] ? (
            <>
              <p className="text-sm font-bold text-foreground truncate">{stats.topProducts[0].name}</p>
              <p className="text-xs text-muted-foreground mt-1">{stats.topProducts[0].quantity}× prodáno</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Žádná data</p>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Trend Chart */}
        <div className="lg:col-span-2 glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">Tržby v čase</h3>
          </div>
          {trendLoading ? (
            <div className="h-[250px] flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
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
                  tickFormatter={(value) => value >= 1000 ? `${value/1000}k` : value}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="glass rounded-lg p-2 border border-border">
                          <p className="text-sm font-medium">{formatCurrency(payload[0].value as number)}</p>
                          <p className="text-xs text-muted-foreground">{payload[0].payload.count} prodejů</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              Žádná data za vybrané období
            </div>
          )}
        </div>

        {/* Payment Methods Pie Chart */}
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">Platební metody</h3>
          </div>
          {paymentMethodPieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={paymentMethodPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {paymentMethodPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {paymentMethodPieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span className="text-xs text-muted-foreground">{entry.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
              Žádná data
            </div>
          )}
        </div>
      </div>

      {/* Top Products Table */}
      {stats?.topProducts && stats.topProducts.length > 0 && (
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="font-medium">Top 5 položek</h3>
          </div>
          <div className="space-y-2">
            {stats.topProducts.slice(0, 5).map((product, index) => (
              <div 
                key={product.productId} 
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg",
                  index === 0 ? "bg-amber-500/10" : "bg-secondary/30"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    index === 0 ? "bg-amber-500 text-white" : "bg-secondary text-muted-foreground"
                  )}>
                    {index + 1}
                  </span>
                  <span className="font-medium">{product.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">{product.quantity}×</span>
                  <span className="font-bold">{formatCurrency(product.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
