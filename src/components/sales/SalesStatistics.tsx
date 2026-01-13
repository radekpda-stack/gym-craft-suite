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
  Percent,
  ChevronRight,
  PieChartIcon,
  LineChart
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
  Bar,
  LineChart as RechartsLineChart,
  Line,
  Legend
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProducts } from '@/hooks/useProducts';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { ProductSalesDetailModal } from './ProductSalesDetailModal';

type Period = 'today' | 'week' | 'month' | 'year' | 'all';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Dnes' },
  { value: 'week', label: 'Tento týden' },
  { value: 'month', label: 'Tento měsíc' },
  { value: 'year', label: 'Tento rok' },
  { value: 'all', label: 'Vše' },
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

const CATEGORY_LABELS: Record<string, string> = {
  supplements: 'Doplňky',
  apparel: 'Oblečení',
  equipment: 'Vybavení',
  food: 'Potraviny',
  drinks: 'Nápoje',
  accessories: 'Doplňky',
  other: 'Ostatní',
};

// Hook for combined statistics (sales_orders + credit_transactions fallback)
function useCombinedSalesStats(period: Period) {
  const { data: products = [] } = useProducts();
  
  return useQuery({
    queryKey: ['combined_sales_stats', period],
    queryFn: async () => {
      const now = new Date();
      let fromDate: Date | null = null;

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
        case 'all':
          fromDate = null;
          break;
      }

      // Try new sales_orders first
      let ordersQuery = supabase
        .from('sales_orders')
        .select('id, total_amount, payment_method, payment_status, created_at')
        .eq('payment_status', 'completed');
      
      if (fromDate) {
        ordersQuery = ordersQuery.gte('created_at', fromDate.toISOString());
      }
      
      const { data: orders } = await ordersQuery;

      // Get order items if we have orders - include product for purchase_price
      let orderItems: any[] = [];
      if (orders && orders.length > 0) {
        const { data: items } = await supabase
          .from('sales_order_items')
          .select('*, products(purchase_price, category)')
          .in('order_id', orders.map(o => o.id));
        orderItems = items || [];
      }

      // Fallback to credit_transactions if no orders
      let legacySales: any[] = [];
      if (!orders || orders.length === 0) {
        let legacyQuery = supabase
          .from('credit_transactions')
          .select('*, products(id, name, price, category, purchase_price)')
          .eq('type', 'product');
        
        if (fromDate) {
          legacyQuery = legacyQuery.gte('created_at', fromDate.toISOString());
        }
        
        const { data: transactions } = await legacyQuery;
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
      const productStats: Record<string, { name: string; quantity: number; revenue: number; costs: number; category: string }> = {};
      const dailyData: Record<string, { date: string; revenue: number; count: number; profit: number; costs: number }> = {};

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
            dailyData[dateKey] = { date: dateKey, revenue: 0, count: 0, profit: 0, costs: 0 };
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
            productStats[key] = { name: item.name_snapshot, quantity: 0, revenue: 0, costs: 0, category: item.products?.category || 'other' };
          }
          productStats[key].quantity += item.quantity;
          productStats[key].revenue += item.line_total;
          productStats[key].costs += itemCost;

          // Add profit and costs to daily data
          const order = orders.find(o => o.id === item.order_id);
          if (order) {
            const dateKey = order.created_at.split('T')[0];
            if (dailyData[dateKey]) {
              dailyData[dateKey].profit += item.line_total - itemCost;
              dailyData[dateKey].costs += itemCost;
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
            dailyData[dateKey] = { date: dateKey, revenue: 0, count: 0, profit: 0, costs: 0 };
          }
          dailyData[dateKey].revenue += amount;
          dailyData[dateKey].count++;
          dailyData[dateKey].profit += amount - purchasePrice;
          dailyData[dateKey].costs += purchasePrice;

          // Product stats with costs
          if (sale.product_id && sale.products) {
            const key = sale.product_id;
            if (!productStats[key]) {
              productStats[key] = { name: sale.products.name, quantity: 0, revenue: 0, costs: 0, category: sale.products?.category || 'other' };
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

      // Sort trend data and calculate margin trend
      const trendData = Object.values(dailyData)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(d => ({
          ...d,
          margin: d.revenue > 0 ? ((d.revenue - d.costs) / d.revenue) * 100 : 0
        }));

      // Category stats
      const categoryStats: Record<string, { name: string; revenue: number; count: number }> = {};
      topProducts.forEach(p => {
        const cat = p.category || 'other';
        const catLabel = CATEGORY_LABELS[cat] || cat;
        if (!categoryStats[cat]) {
          categoryStats[cat] = { name: catLabel, revenue: 0, count: 0 };
        }
        categoryStats[cat].revenue += p.revenue;
        categoryStats[cat].count += p.quantity;
      });

      const categoryData = Object.values(categoryStats).sort((a, b) => b.revenue - a.revenue);

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
        categoryData,
      };
    },
  });
}

export function SalesStatistics() {
  const [period, setPeriod] = useState<Period>('month');
  const { data: stats, isLoading } = useCombinedSalesStats(period);
  
  // Product detail modal state
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string } | null>(null);

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
      productId: p.productId,
      quantity: p.quantity,
      revenue: p.revenue,
    }));
  }, [stats?.topProducts]);

  // Handle product click
  const handleProductClick = (productId: string, productName: string) => {
    setSelectedProduct({ id: productId, name: productName });
  };

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
          {/* KPI Cards - 4 main metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
            <div className="glass rounded-xl p-4 border border-success/30 bg-success/5">
              <div className="flex items-center gap-2 text-success mb-2">
                <Banknote className="w-4 h-4" />
                <span className="text-xs font-medium">Čistý zisk</span>
              </div>
              <p className={cn(
                "text-2xl font-bold",
                stats.totalProfit >= 0 ? "text-success" : "text-destructive"
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
          </div>

          {/* Trend Chart - Full Width */}
          <div className="glass rounded-xl p-4">
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

          {/* Payment Methods - Simplified to numbers */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-medium">Platební metody</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(stats.byPaymentMethod)
                .filter(([_, data]) => data.count > 0)
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .map(([method, data]) => {
                  const methodInfo = PAYMENT_METHOD_LABELS[method];
                  const Icon = methodInfo?.icon || Wallet;
                  const percentage = stats.totalRevenue > 0 
                    ? ((data.revenue / stats.totalRevenue) * 100).toFixed(0) 
                    : 0;
                  return (
                    <div key={method} className="bg-secondary/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{methodInfo?.label || method}</span>
                      </div>
                      <p className="text-lg font-bold">{formatCurrency(data.revenue)}</p>
                      <p className="text-xs text-muted-foreground">
                        {data.count}× • {percentage}%
                      </p>
                    </div>
                  );
                })}
              {Object.values(stats.byPaymentMethod).every(d => d.count === 0) && (
                <p className="text-sm text-muted-foreground col-span-full text-center py-4">
                  Žádné platby
                </p>
              )}
            </div>
          </div>

          {/* New Row: Category Chart + Margin Trend */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Category Pie Chart */}
            {stats.categoryData && stats.categoryData.length > 0 && (
              <div className="glass rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <PieChartIcon className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-medium">Kategorie produktů</h3>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={stats.categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="revenue"
                    >
                      {stats.categoryData.map((_, index) => (
                        <Cell key={`cat-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload?.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                              <p className="font-medium">{d.name}</p>
                              <p className="text-xs">{formatCurrency(d.revenue)}</p>
                              <p className="text-xs text-muted-foreground">{d.count}× prodáno</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {stats.categoryData.map((cat, index) => (
                    <div key={cat.name} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="text-xs text-muted-foreground">{cat.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Margin Trend Chart */}
            {chartData.length > 1 && (
              <div className="glass rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <LineChart className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-medium">Trend marže</h3>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <RechartsLineChart data={chartData}>
                    <defs>
                      <linearGradient id="colorMargin" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
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
                      tickFormatter={(v) => `${v.toFixed(0)}%`}
                      domain={[0, 'auto']}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload?.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                              <p className="font-medium">Marže: {d.margin?.toFixed(1)}%</p>
                              <p className="text-xs">Tržby: {formatCurrency(d.revenue)}</p>
                              <p className="text-xs text-muted-foreground">Zisk: {formatCurrency(d.profit)}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="margin"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--chart-2))', r: 3 }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Products Bar Chart */}
          {productBarData.length > 0 && (
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-medium">Prodeje podle produktu</h3>
                <span className="text-xs text-muted-foreground">(klikněte pro detail)</span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={productBarData} 
                  layout="vertical"
                  onClick={(data) => {
                    if (data?.activePayload?.[0]?.payload) {
                      const p = data.activePayload[0].payload;
                      handleProductClick(p.productId, p.fullName);
                    }
                  }}
                  className="cursor-pointer"
                >
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
                          <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                            <p className="text-sm font-medium">{data.fullName}</p>
                            <p className="text-xs">{data.quantity}× prodáno</p>
                            <p className="text-xs text-muted-foreground">Tržby: {formatCurrency(data.revenue)}</p>
                            <p className="text-xs text-primary mt-1">Klikněte pro detail</p>
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

          {/* All Products Table - sorted by sales with clickable rows */}
          {stats.topProducts.length > 0 && (
            <div className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <h3 className="font-medium">Nejprodávanější produkty</h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  {stats.topProducts.length} položek • klikněte pro detail
                </span>
              </div>
              
              {/* Table Header */}
              <div className="hidden sm:grid grid-cols-[auto_1fr_repeat(4,80px)_24px] gap-2 px-3 py-2 text-xs text-muted-foreground font-medium border-b border-border mb-2">
                <span className="w-7">#</span>
                <span>Produkt</span>
                <span className="text-right">Ks</span>
                <span className="text-right">Tržby</span>
                <span className="text-right">Náklady</span>
                <span className="text-right">Zisk</span>
                <span></span>
              </div>
              
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {stats.topProducts.map((product, index) => (
                  <div 
                    key={product.productId}
                    onClick={() => handleProductClick(product.productId, product.name)}
                    className={cn(
                      "grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_repeat(4,80px)_24px] gap-2 items-center p-3 rounded-lg cursor-pointer transition-colors hover:bg-primary/10",
                      index === 0 ? "bg-warning/10" : 
                      index === 1 ? "bg-muted/30" :
                      index === 2 ? "bg-warning/5" : "bg-secondary/30"
                    )}
                  >
                    {/* Rank badge */}
                    <span className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      index === 0 ? "bg-warning text-warning-foreground" : 
                      index === 1 ? "bg-muted-foreground text-background" :
                      index === 2 ? "bg-warning/70 text-warning-foreground" : "bg-secondary text-muted-foreground"
                    )}>
                      {index + 1}
                    </span>
                    
                    {/* Product name */}
                    <div className="min-w-0">
                      <span className="font-medium block truncate">{product.name}</span>
                      {/* Mobile: show all values */}
                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground sm:hidden">
                        <span>{product.quantity}×</span>
                        <span>{formatCurrency(product.revenue)}</span>
                        <span className={product.profit >= 0 ? "text-success" : "text-destructive"}>
                          +{formatCurrency(product.profit)}
                        </span>
                        <span>({product.margin.toFixed(0)}%)</span>
                      </div>
                    </div>
                    
                    {/* Desktop columns */}
                    <span className="hidden sm:block text-right text-sm">{product.quantity}×</span>
                    <span className="hidden sm:block text-right text-sm font-medium">{formatCurrency(product.revenue)}</span>
                    <span className="hidden sm:block text-right text-sm text-muted-foreground">{formatCurrency(product.costs)}</span>
                    <span className={cn(
                      "hidden sm:block text-right text-sm font-medium",
                      product.profit >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {formatCurrency(product.profit)}
                    </span>
                    
                    {/* Chevron */}
                    <ChevronRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
                    
                    {/* Mobile chevron */}
                    <ChevronRight className="w-4 h-4 text-muted-foreground sm:hidden" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Product Detail Modal */}
      <ProductSalesDetailModal
        productId={selectedProduct?.id ?? null}
        productName={selectedProduct?.name ?? ''}
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
      />
    </div>
  );
}
