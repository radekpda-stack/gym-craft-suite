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
  TrendingDown,
  DollarSign,
  Percent
} from 'lucide-react';
import { format, subDays, subMonths, startOfDay, startOfMonth } from 'date-fns';
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
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

const CHART_COLORS = [
  'hsl(var(--primary))', 
  'hsl(var(--chart-2))', 
  'hsl(var(--chart-3))', 
  'hsl(var(--chart-4))', 
  'hsl(var(--chart-5))'
];

const PAYMENT_METHOD_LABELS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  cash: { label: 'Hotově', icon: Banknote },
  card: { label: 'Kartou', icon: CreditCard },
  bank: { label: 'Převodem', icon: Building },
  credit: { label: 'Kreditem', icon: Wallet },
};

// Hook for combined statistics (sales_orders + credit_transactions fallback)
function useCombinedSalesStats(period: Period) {
  const { data: products = [] } = useProducts();
  
  return useQuery({
    queryKey: ['combined_sales_stats', period],
    queryFn: async () => {
      const now = new Date();
      let fromDate: Date;

      switch (period) {
        case 'today':
          fromDate = startOfDay(now);
          break;
        case 'week':
          fromDate = subDays(now, 7);
          break;
        case 'month':
          fromDate = startOfMonth(now);
          break;
        case 'year':
          fromDate = subMonths(now, 12);
          break;
      }

      // Try new sales_orders first
      const { data: orders } = await supabase
        .from('sales_orders')
        .select('id, total_amount, payment_method, payment_status, created_at')
        .gte('created_at', fromDate.toISOString())
        .eq('payment_status', 'completed');

      // Get order items if we have orders - include product for purchase_price
      let orderItems: any[] = [];
      if (orders && orders.length > 0) {
        const { data: items } = await supabase
          .from('sales_order_items')
          .select('*, products(purchase_price)')
          .in('order_id', orders.map(o => o.id));
        orderItems = items || [];
      }

      // Fallback to credit_transactions if no orders
      let legacySales: any[] = [];
      if (!orders || orders.length === 0) {
        const { data: transactions } = await supabase
          .from('credit_transactions')
          .select('*, products(id, name, price, category, purchase_price)')
          .eq('type', 'product')
          .gte('created_at', fromDate.toISOString());
        legacySales = transactions || [];
      }

      // Calculate stats
      let totalRevenue = 0;
      let totalCosts = 0;
      let totalOrders = 0;
      const byPaymentMethod: Record<string, { count: number; revenue: number }> = {
        cash: { count: 0, revenue: 0 },
        card: { count: 0, revenue: 0 },
        bank: { count: 0, revenue: 0 },
        credit: { count: 0, revenue: 0 },
      };
      const productStats: Record<string, { name: string; quantity: number; revenue: number; costs: number }> = {};
      const dailyData: Record<string, { date: string; revenue: number; count: number; profit: number }> = {};

      if (orders && orders.length > 0) {
        // Use new orders
        totalOrders = orders.length;
        orders.forEach(order => {
          totalRevenue += order.total_amount || 0;
          const method = order.payment_method || 'cash';
          if (byPaymentMethod[method]) {
            byPaymentMethod[method].count++;
            byPaymentMethod[method].revenue += order.total_amount || 0;
          }

          // Daily aggregation - profit calculated later
          const dateKey = order.created_at.split('T')[0];
          if (!dailyData[dateKey]) {
            dailyData[dateKey] = { date: dateKey, revenue: 0, count: 0, profit: 0 };
          }
          dailyData[dateKey].revenue += order.total_amount || 0;
          dailyData[dateKey].count++;
        });

        // Product stats from order items - include costs
        orderItems.forEach(item => {
          const key = item.product_id;
          const purchasePrice = item.products?.purchase_price || 0;
          const itemCost = purchasePrice * item.quantity;
          totalCosts += itemCost;

          if (!productStats[key]) {
            productStats[key] = { name: item.name_snapshot, quantity: 0, revenue: 0, costs: 0 };
          }
          productStats[key].quantity += item.quantity;
          productStats[key].revenue += item.line_total;
          productStats[key].costs += itemCost;

          // Add profit to daily data
          const order = orders.find(o => o.id === item.order_id);
          if (order) {
            const dateKey = order.created_at.split('T')[0];
            if (dailyData[dateKey]) {
              dailyData[dateKey].profit += item.line_total - itemCost;
            }
          }
        });
      } else if (legacySales.length > 0) {
        // Use legacy transactions
        totalOrders = legacySales.length;
        legacySales.forEach(sale => {
          const amount = Math.abs(sale.amount || 0);
          const purchasePrice = sale.products?.purchase_price || 0;
          totalRevenue += amount;
          totalCosts += purchasePrice;
          
          const method = sale.payment_method || 'credit';
          if (byPaymentMethod[method]) {
            byPaymentMethod[method].count++;
            byPaymentMethod[method].revenue += amount;
          }

          // Daily aggregation with profit
          const dateKey = sale.created_at.split('T')[0];
          if (!dailyData[dateKey]) {
            dailyData[dateKey] = { date: dateKey, revenue: 0, count: 0, profit: 0 };
          }
          dailyData[dateKey].revenue += amount;
          dailyData[dateKey].count++;
          dailyData[dateKey].profit += amount - purchasePrice;

          // Product stats with costs
          if (sale.product_id && sale.products) {
            const key = sale.product_id;
            if (!productStats[key]) {
              productStats[key] = { name: sale.products.name, quantity: 0, revenue: 0, costs: 0 };
            }
            productStats[key].quantity++;
            productStats[key].revenue += amount;
            productStats[key].costs += purchasePrice;
          }
        });
      }

      // Calculate profit and margin
      const totalProfit = totalRevenue - totalCosts;
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      // Sort products by quantity (most sold first)
      const topProducts = Object.entries(productStats)
        .map(([id, stats]) => ({ 
          productId: id, 
          ...stats,
          profit: stats.revenue - stats.costs,
          margin: stats.revenue > 0 ? ((stats.revenue - stats.costs) / stats.revenue) * 100 : 0
        }))
        .sort((a, b) => b.quantity - a.quantity);

      // Sort trend data
      const trendData = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

      // Calculate average order value
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const avgProfit = totalOrders > 0 ? totalProfit / totalOrders : 0;

      return {
        totalRevenue,
        totalCosts,
        totalProfit,
        profitMargin,
        totalOrders,
        avgOrderValue,
        avgProfit,
        byPaymentMethod,
        topProducts,
        trendData,
      };
    },
  });
}

export function SalesStatistics() {
  const [period, setPeriod] = useState<Period>('month');
  const { data: stats, isLoading } = useCombinedSalesStats(period);

  // Format trend data for chart
  const chartData = useMemo(() => {
    if (!stats?.trendData) return [];
    return stats.trendData.map(item => ({
      ...item,
      label: period === 'year' 
        ? format(new Date(item.date), 'MMM', { locale: cs })
        : format(new Date(item.date), 'd.M.', { locale: cs }),
    }));
  }, [stats?.trendData, period]);

  // Pie chart data for payment methods
  const paymentMethodPieData = useMemo(() => {
    if (!stats?.byPaymentMethod) return [];
    return Object.entries(stats.byPaymentMethod)
      .filter(([_, data]) => data.revenue > 0)
      .map(([method, data]) => ({
        name: PAYMENT_METHOD_LABELS[method]?.label || method,
        value: data.revenue,
        count: data.count,
      }));
  }, [stats?.byPaymentMethod]);

  // Bar chart data for products
  const productBarData = useMemo(() => {
    if (!stats?.topProducts) return [];
    return stats.topProducts.slice(0, 10).map(p => ({
      name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
      fullName: p.name,
      quantity: p.quantity,
      revenue: p.revenue,
    }));
  }, [stats?.topProducts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasData = stats && stats.totalOrders > 0;

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

      {!hasData ? (
        <div className="glass rounded-xl p-8 text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Žádné prodeje</h3>
          <p className="text-muted-foreground text-sm">
            Za vybrané období nebyly zaznamenány žádné prodeje
          </p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Tržby */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">Tržby celkem</span>
              </div>
              <p className="text-2xl font-bold text-primary">{formatCurrency(stats.totalRevenue)}</p>
              <p className="text-xs text-muted-foreground mt-1">{PERIODS.find(p => p.value === period)?.label}</p>
            </div>

            {/* Náklady */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingDown className="w-4 h-4" />
                <span className="text-xs">Náklady</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalCosts)}</p>
              <p className="text-xs text-muted-foreground mt-1">nákupní ceny</p>
            </div>

            {/* Čistý zisk */}
            <div className="glass rounded-xl p-4 border border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
                <Banknote className="w-4 h-4" />
                <span className="text-xs font-medium">Čistý zisk</span>
              </div>
              <p className={cn(
                "text-2xl font-bold",
                stats.totalProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
              )}>
                {formatCurrency(stats.totalProfit)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                marže {stats.profitMargin.toFixed(1)}%
              </p>
            </div>

            {/* Počet prodejů */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <ShoppingCart className="w-4 h-4" />
                <span className="text-xs">Počet prodejů</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
              <p className="text-xs text-muted-foreground mt-1">transakcí</p>
            </div>

            {/* Průměrný zisk */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Percent className="w-4 h-4" />
                <span className="text-xs">Průměrný zisk</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.avgProfit)}</p>
              <p className="text-xs text-muted-foreground mt-1">na prodej</p>
            </div>

            {/* Nejprodávanější */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-xs">Nejprodávanější</span>
              </div>
              {stats.topProducts[0] ? (
                <>
                  <p className="text-sm font-bold text-foreground truncate">{stats.topProducts[0].name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stats.topProducts[0].quantity}× prodáno</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Žádná data</p>
              )}
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Trend Chart */}
            <div className="lg:col-span-2 glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-medium">Tržby v čase</h3>
              </div>
              {chartData.length > 0 ? (
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
                      tickFormatter={(value) => value >= 1000 ? `${Math.round(value/1000)}k` : value}
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
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="glass rounded-lg p-2 border border-border">
                                <p className="text-sm font-medium">{data.name}</p>
                                <p className="text-xs">{formatCurrency(data.value)}</p>
                                <p className="text-xs text-muted-foreground">{data.count} transakcí</p>
                              </div>
                            );
                          }
                          return null;
                        }}
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

          {/* Products Bar Chart */}
          {productBarData.length > 0 && (
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-medium">Prodeje podle produktu</h3>
                <span className="text-xs text-muted-foreground">(seřazeno od nejprodávanějších)</span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productBarData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis 
                    type="number"
                    className="text-xs fill-muted-foreground"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name"
                    className="text-xs fill-muted-foreground"
                    axisLine={false}
                    tickLine={false}
                    width={120}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="glass rounded-lg p-2 border border-border">
                            <p className="text-sm font-medium">{data.fullName}</p>
                            <p className="text-xs">{data.quantity}× prodáno</p>
                            <p className="text-xs text-muted-foreground">Tržby: {formatCurrency(data.revenue)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="quantity" 
                    fill="hsl(var(--primary))" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* All Products Table - sorted by sales */}
          {stats.topProducts.length > 0 && (
            <div className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <h3 className="font-medium">Všechny produkty</h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  {stats.topProducts.length} položek
                </span>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {stats.topProducts.map((product, index) => {
                  const percentage = stats.totalRevenue > 0 
                    ? Math.round((product.revenue / stats.totalRevenue) * 100) 
                    : 0;
                  
                  return (
                    <div 
                      key={product.productId} 
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg",
                        index === 0 ? "bg-amber-500/10" : 
                        index === 1 ? "bg-slate-400/10" :
                        index === 2 ? "bg-orange-700/10" : "bg-secondary/30"
                      )}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                          index === 0 ? "bg-amber-500 text-white" : 
                          index === 1 ? "bg-slate-400 text-white" :
                          index === 2 ? "bg-orange-700 text-white" : "bg-secondary text-muted-foreground"
                        )}>
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium block truncate">{product.name}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="h-1.5 bg-secondary rounded-full flex-1 max-w-[100px]">
                              <div 
                                className="h-full bg-primary rounded-full" 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{percentage}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm shrink-0">
                        <div className="text-right">
                          <span className="text-muted-foreground block">{product.quantity}×</span>
                        </div>
                        <div className="text-right min-w-[80px]">
                          <span className="font-bold">{formatCurrency(product.revenue)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
