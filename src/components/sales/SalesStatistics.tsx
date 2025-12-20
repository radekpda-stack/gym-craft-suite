import { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  ShoppingCart, 
  Banknote, 
  Package,
  Calendar,
  Loader2,
  Trophy,
  BarChart3
} from 'lucide-react';
import { format, subDays, subMonths, startOfDay, startOfMonth, isWithinInterval } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
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
import { useProductSales } from '@/hooks/useCreditTransactions';
import { useProducts } from '@/hooks/useProducts';
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

export function SalesStatistics() {
  const [period, setPeriod] = useState<Period>('month');
  const { data: allSales = [], isLoading: salesLoading } = useProductSales();
  const { data: products = [] } = useProducts();

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

  // Filter sales by period
  const sales = useMemo(() => {
    return allSales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return isWithinInterval(saleDate, periodRange);
    });
  }, [allSales, periodRange]);

  // Calculate stats
  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const todaySales = allSales.filter(s => new Date(s.created_at) >= today);
    const todayRevenue = todaySales.reduce((sum, s) => sum + Math.abs(s.amount), 0);
    
    const periodRevenue = sales.reduce((sum, s) => sum + Math.abs(s.amount), 0);
    const periodCount = sales.length;

    // Product stats
    const productCounts: Record<string, { name: string; count: number; revenue: number }> = {};
    sales.forEach(sale => {
      const productId = sale.product_id || 'unknown';
      const productName = sale.products?.name || sale.description || 'Neznámý produkt';
      if (!productCounts[productId]) {
        productCounts[productId] = { name: productName, count: 0, revenue: 0 };
      }
      productCounts[productId].count += 1;
      productCounts[productId].revenue += Math.abs(sale.amount);
    });

    const topProducts = Object.entries(productCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([id, data]) => ({ id, ...data }));

    const bestSeller = topProducts[0];

    // Products vs services breakdown
    const productRevenue = sales
      .filter(s => {
        const product = products.find(p => p.id === s.product_id);
        return product && product.category !== 'service';
      })
      .reduce((sum, s) => sum + Math.abs(s.amount), 0);
    
    const serviceRevenue = sales
      .filter(s => {
        const product = products.find(p => p.id === s.product_id);
        return product && product.category === 'service';
      })
      .reduce((sum, s) => sum + Math.abs(s.amount), 0);

    return {
      todayRevenue,
      todayCount: todaySales.length,
      periodRevenue,
      periodCount,
      topProducts,
      bestSeller,
      productRevenue,
      serviceRevenue,
    };
  }, [sales, allSales, products]);

  // Trend data for chart
  const trendData = useMemo(() => {
    const grouped: Record<string, { date: string; revenue: number; count: number }> = {};
    
    sales.forEach(sale => {
      const dateKey = period === 'year' 
        ? format(new Date(sale.created_at), 'yyyy-MM')
        : format(new Date(sale.created_at), 'yyyy-MM-dd');
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = { 
          date: dateKey, 
          revenue: 0, 
          count: 0 
        };
      }
      grouped[dateKey].revenue += Math.abs(sale.amount);
      grouped[dateKey].count += 1;
    });

    return Object.values(grouped)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(item => ({
        ...item,
        label: period === 'year' 
          ? format(new Date(item.date + '-01'), 'MMM', { locale: cs })
          : format(new Date(item.date), 'd.M.', { locale: cs }),
      }));
  }, [sales, period]);

  // Pie chart data
  const pieData = useMemo(() => {
    if (stats.productRevenue === 0 && stats.serviceRevenue === 0) return [];
    return [
      { name: 'Produkty', value: stats.productRevenue },
      { name: 'Služby', value: stats.serviceRevenue },
    ].filter(d => d.value > 0);
  }, [stats]);

  if (salesLoading) {
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
            <Banknote className="w-4 h-4" />
            <span className="text-xs">Tržby dnes</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.todayRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-1">{stats.todayCount} prodejů</p>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">Tržby za období</span>
          </div>
          <p className="text-2xl font-bold text-primary">{formatCurrency(stats.periodRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-1">{PERIODS.find(p => p.value === period)?.label}</p>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <ShoppingCart className="w-4 h-4" />
            <span className="text-xs">Počet prodejů</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.periodCount}</p>
          <p className="text-xs text-muted-foreground mt-1">za období</p>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-xs">Nejprodávanější</span>
          </div>
          {stats.bestSeller ? (
            <>
              <p className="text-sm font-bold text-foreground truncate">{stats.bestSeller.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{stats.bestSeller.count}× prodáno</p>
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
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trendData}>
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
                  tickFormatter={(value) => `${value/1000}k`}
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

        {/* Pie Chart */}
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">Produkty vs Služby</h3>
          </div>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {pieData.map((entry, index) => (
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
      {stats.topProducts.length > 0 && (
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="font-medium">Top 5 položek</h3>
          </div>
          <div className="space-y-2">
            {stats.topProducts.map((product, index) => (
              <div 
                key={product.id} 
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
                  <span className="text-muted-foreground">{product.count}×</span>
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
