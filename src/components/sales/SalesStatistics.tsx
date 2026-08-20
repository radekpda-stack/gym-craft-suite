import { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  ShoppingCart, 
  Banknote, 
  Package,
  Trophy,
  BarChart3,
  CreditCard,
  Building,
  Wallet,
  DollarSign,
  Percent,
  ChevronRight,
  PieChartIcon,
  LineChart,
  CalendarDays,
  Inbox
} from 'lucide-react';
import { format, subDays, subMonths, startOfDay, startOfMonth, getDay, getHours } from 'date-fns';
import { cs } from 'date-fns/locale';
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
  LabelList,
  LineChart as RechartsLineChart,
  Line,
  Legend
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProducts } from '@/hooks/useProducts';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { SparklineCard } from '@/components/charts/SparklineCard';
import { ProductSalesDetailModal } from './ProductSalesDetailModal';
import { SalesInsights } from './SalesInsights';
import { ComparisonBadge } from './ComparisonBadge';
import { SalesHeatmap } from './SalesHeatmap';
import { TopClientsChart } from './TopClientsChart';
import { CategoryTrendChart } from './CategoryTrendChart';
import { SalesSectionHeader, SalesEmptyState, SalesChipFilter } from './ui/SalesUI';

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

// Helper to get date range for a period
function getDateRange(period: Period, offset = 0) {
  const now = new Date();
  let fromDate: Date | null = null;
  let toDate: Date | null = null;

  switch (period) {
    case 'today':
      fromDate = startOfDay(subDays(now, offset));
      toDate = offset > 0 ? startOfDay(subDays(now, offset - 1)) : null;
      break;
    case 'week':
      fromDate = subDays(now, 7 + (offset * 7));
      toDate = offset > 0 ? subDays(now, offset * 7) : null;
      break;
    case 'month':
      fromDate = startOfMonth(subMonths(now, offset));
      toDate = offset > 0 ? startOfMonth(subMonths(now, offset - 1)) : null;
      break;
    case 'year':
      fromDate = subMonths(now, 12 + (offset * 12));
      toDate = offset > 0 ? subMonths(now, offset * 12) : null;
      break;
    case 'all':
      fromDate = null;
      toDate = null;
      break;
  }
  
  return { fromDate, toDate };
}

// Convert JS getDay (0=Sun) to Monday-first (0=Mon)
function dowMondayFirst(date: Date): number {
  const d = getDay(date);
  return d === 0 ? 6 : d - 1;
}

// Fetch stats for a period
async function fetchPeriodStats(period: Period, products: any[], offset = 0) {
  const { fromDate, toDate } = getDateRange(period, offset);

  // Try new sales_orders first
  let ordersQuery = supabase
    .from('sales_orders')
    .select('id, total_amount, payment_method, payment_status, created_at, client_id')
    .eq('payment_status', 'completed');
  
  if (fromDate) {
    ordersQuery = ordersQuery.gte('created_at', fromDate.toISOString());
  }
  if (toDate) {
    ordersQuery = ordersQuery.lt('created_at', toDate.toISOString());
  }
  
  const { data: orders } = await ordersQuery;

  // Get order items if we have orders
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
      .select('*, products(id, name, price, category, purchase_price), clients(first_name, last_name)')
      .eq('type', 'product');
    
    if (fromDate) {
      legacyQuery = legacyQuery.gte('created_at', fromDate.toISOString());
    }
    if (toDate) {
      legacyQuery = legacyQuery.lt('created_at', toDate.toISOString());
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
  
  // New data structures
  const hourlyHeatmap: { dow: number; hour: number; count: number }[] = [];
  const clientMap: Record<string, { name: string; orderCount: number; totalSpent: number }> = {};
  const categoryTrendMap: Record<string, Record<string, number>> = {};

  if (orders && orders.length > 0) {
    totalOrders = orders.length;
    orders.forEach(order => {
      totalRevenue += order.total_amount || 0;
      const method = order.payment_method || 'cash';
      if (byPaymentMethod[method]) {
        byPaymentMethod[method].count++;
        byPaymentMethod[method].revenue += order.total_amount || 0;
      }

      const createdAt = new Date(order.created_at);
      const dateKey = order.created_at.split('T')[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { date: dateKey, revenue: 0, count: 0, profit: 0, costs: 0 };
      }
      dailyData[dateKey].revenue += order.total_amount || 0;
      dailyData[dateKey].count++;

      // Heatmap
      hourlyHeatmap.push({ dow: dowMondayFirst(createdAt), hour: getHours(createdAt), count: 1 });

      // Client stats
      if (order.client_id) {
        if (!clientMap[order.client_id]) {
          clientMap[order.client_id] = { name: order.client_id, orderCount: 0, totalSpent: 0 };
        }
        clientMap[order.client_id].orderCount++;
        clientMap[order.client_id].totalSpent += order.total_amount || 0;
      }
    });

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

      const order = orders.find(o => o.id === item.order_id);
      if (order) {
        const dateKey = order.created_at.split('T')[0];
        if (dailyData[dateKey]) {
          dailyData[dateKey].profit += item.line_total - itemCost;
          dailyData[dateKey].costs += itemCost;
        }
        
        // Category trend
        const periodKey = period === 'today' || period === 'week'
          ? dateKey
          : format(new Date(dateKey), 'yyyy-MM');
        const cat = CATEGORY_LABELS[item.products?.category || 'other'] || item.products?.category || 'Ostatní';
        if (!categoryTrendMap[periodKey]) categoryTrendMap[periodKey] = {};
        categoryTrendMap[periodKey][cat] = (categoryTrendMap[periodKey][cat] || 0) + item.line_total;
      }
    });

    // Resolve client names for orders
    if (Object.keys(clientMap).length > 0) {
      const { data: clients } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .in('id', Object.keys(clientMap));
      clients?.forEach(c => {
        if (clientMap[c.id]) {
          clientMap[c.id].name = `${c.first_name} ${c.last_name}`.trim();
        }
      });
    }
  } else if (legacySales.length > 0) {
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

      const createdAt = new Date(sale.created_at);
      const dateKey = sale.created_at.split('T')[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { date: dateKey, revenue: 0, count: 0, profit: 0, costs: 0 };
      }
      dailyData[dateKey].revenue += amount;
      dailyData[dateKey].count++;
      dailyData[dateKey].profit += amount - purchasePrice;
      dailyData[dateKey].costs += purchasePrice;

      // Heatmap
      hourlyHeatmap.push({ dow: dowMondayFirst(createdAt), hour: getHours(createdAt), count: 1 });

      // Client stats
      if (sale.client_id) {
        if (!clientMap[sale.client_id]) {
          const clientName = sale.clients 
            ? `${sale.clients.first_name} ${sale.clients.last_name}`.trim()
            : sale.client_id;
          clientMap[sale.client_id] = { name: clientName, orderCount: 0, totalSpent: 0 };
        }
        clientMap[sale.client_id].orderCount++;
        clientMap[sale.client_id].totalSpent += amount;
      }

      if (sale.product_id && sale.products) {
        const key = sale.product_id;
        if (!productStats[key]) {
          productStats[key] = { name: sale.products.name, quantity: 0, revenue: 0, costs: 0, category: sale.products?.category || 'other' };
        }
        productStats[key].quantity++;
        productStats[key].revenue += amount;
        productStats[key].costs += purchasePrice;

        // Category trend
        const periodKey = period === 'today' || period === 'week'
          ? dateKey
          : format(new Date(dateKey), 'yyyy-MM');
        const cat = CATEGORY_LABELS[sale.products?.category || 'other'] || sale.products?.category || 'Ostatní';
        if (!categoryTrendMap[periodKey]) categoryTrendMap[periodKey] = {};
        categoryTrendMap[periodKey][cat] = (categoryTrendMap[periodKey][cat] || 0) + amount;
      }
    });
  }

  const totalProfit = totalRevenue - totalCosts;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const topProducts = Object.entries(productStats)
    .map(([id, stats]) => ({ 
      productId: id, 
      ...stats,
      profit: stats.revenue - stats.costs,
      margin: stats.revenue > 0 ? ((stats.revenue - stats.costs) / stats.revenue) * 100 : 0
    }))
    .sort((a, b) => b.quantity - a.quantity);

  const trendData = Object.values(dailyData)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({
      ...d,
      margin: d.revenue > 0 ? ((d.revenue - d.costs) / d.revenue) * 100 : 0
    }));

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
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const avgProfit = totalOrders > 0 ? totalProfit / totalOrders : 0;

  // Active days count & avg per day
  const activeDays = Object.keys(dailyData).length;
  const avgPerDay = activeDays > 0 ? totalRevenue / activeDays : 0;

  // Client stats array
  const clientStats = Object.values(clientMap).sort((a, b) => b.totalSpent - a.totalSpent);

  // Category trend array
  const allCategories = new Set<string>();
  Object.values(categoryTrendMap).forEach(cats => {
    Object.keys(cats).forEach(c => allCategories.add(c));
  });
  const categoryTrend = Object.entries(categoryTrendMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodKey, cats]) => ({
      period: period === 'today' || period === 'week'
        ? format(new Date(periodKey), 'd.M.', { locale: cs })
        : format(new Date(periodKey + '-01'), 'MMM', { locale: cs }),
      ...cats,
    }));

  // AOV trend
  const aovTrend = trendData
    .filter(d => d.count > 0)
    .map(d => ({
      label: period === 'year'
        ? format(new Date(d.date), 'MMM', { locale: cs })
        : format(new Date(d.date), 'd.M.', { locale: cs }),
      aov: d.revenue / d.count,
    }));

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
    // New fields
    activeDays,
    avgPerDay,
    hourlyHeatmap,
    clientStats,
    categoryTrend,
    categoryTrendCategories: Array.from(allCategories),
    aovTrend,
  };
}

// Hook for combined statistics with period comparison
function useCombinedSalesStats(period: Period) {
  const { data: products = [] } = useProducts();
  
  return useQuery({
    queryKey: ['combined_sales_stats', period],
    queryFn: async () => {
      // Fetch current and previous period in parallel
      const [current, previous] = await Promise.all([
        fetchPeriodStats(period, products, 0),
        period !== 'all' ? fetchPeriodStats(period, products, 1) : null,
      ]);

      return {
        ...current,
        previousPeriod: previous ? {
          totalRevenue: previous.totalRevenue,
          totalCosts: previous.totalCosts,
          totalProfit: previous.totalProfit,
          totalOrders: previous.totalOrders,
        } : undefined,
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
      <div className="space-y-4 sm:space-y-6">
        <Skeleton className="h-9 w-64 rounded-full" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[280px] rounded-2xl" />
        <div className="grid lg:grid-cols-2 gap-4">
          <Skeleton className="h-[280px] rounded-2xl" />
          <Skeleton className="h-[280px] rounded-2xl" />
        </div>
      </div>
    );
  }

  const hasData = stats && stats.totalOrders > 0;

  const bestProduct = stats?.topProducts?.[0];

  const revenueTrend = stats?.previousPeriod && stats.previousPeriod.totalRevenue > 0
    ? ((stats.totalRevenue - stats.previousPeriod.totalRevenue) / stats.previousPeriod.totalRevenue) * 100
    : undefined;
  const ordersTrend = stats?.previousPeriod && stats.previousPeriod.totalOrders > 0
    ? ((stats.totalOrders - stats.previousPeriod.totalOrders) / stats.previousPeriod.totalOrders) * 100
    : undefined;
  const prevAvgOrder = stats?.previousPeriod && stats.previousPeriod.totalOrders > 0
    ? stats.previousPeriod.totalRevenue / stats.previousPeriod.totalOrders
    : undefined;
  const avgOrderTrend = stats && prevAvgOrder && prevAvgOrder > 0
    ? ((stats.avgOrderValue - prevAvgOrder) / prevAvgOrder) * 100
    : undefined;
  const prevMargin = stats?.previousPeriod && stats.previousPeriod.totalRevenue > 0
    ? (stats.previousPeriod.totalProfit / stats.previousPeriod.totalRevenue) * 100
    : undefined;
  const marginTrend = stats && prevMargin !== undefined
    ? stats.profitMargin - prevMargin
    : undefined;

  const revenueSparkline = chartData.map(d => ({ value: d.revenue }));
  const ordersSparkline = chartData.map(d => ({ value: d.count }));
  const aovSparkline = (stats?.aovTrend ?? []).map(d => ({ value: d.aov }));
  const marginSparkline = chartData.map(d => ({ value: d.margin }));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Period Filter */}
      <SalesChipFilter
        options={PERIODS.map(p => ({ value: p.value, label: p.label }))}
        value={period}
        onChange={(v) => setPeriod(v as Period)}
      />

      {!hasData ? (
        <div className="section-card">
          <SalesEmptyState
            icon={Package}
            title="Žádné prodeje"
            description="Za vybrané období nebyly zaznamenány žádné prodeje"
          />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SparklineCard
              title="Tržby"
              value={formatCurrency(stats.totalRevenue)}
              data={revenueSparkline.length > 1 ? revenueSparkline : [{ value: 0 }, { value: stats.totalRevenue }]}
              trend={revenueTrend !== undefined ? Math.round(revenueTrend) : undefined}
              trendLabel="vs. minulé období"
              variant="primary"
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <SparklineCard
              title="Počet prodejů"
              value={stats.totalOrders}
              data={ordersSparkline.length > 1 ? ordersSparkline : [{ value: 0 }, { value: stats.totalOrders }]}
              trend={ordersTrend !== undefined ? Math.round(ordersTrend) : undefined}
              variant="blue"
              icon={<ShoppingCart className="w-4 h-4" />}
            />
            <SparklineCard
              title="Průměrná objednávka"
              value={formatCurrency(stats.avgOrderValue)}
              data={aovSparkline.length > 1 ? aovSparkline : [{ value: 0 }, { value: stats.avgOrderValue }]}
              trend={avgOrderTrend !== undefined ? Math.round(avgOrderTrend) : undefined}
              variant="success"
              icon={<DollarSign className="w-4 h-4" />}
            />
            <SparklineCard
              title="Marže"
              value={`${stats.profitMargin.toFixed(1)}%`}
              data={marginSparkline.length > 1 ? marginSparkline : [{ value: 0 }, { value: stats.profitMargin }]}
              trend={marginTrend !== undefined ? Math.round(marginTrend) : undefined}
              subtitle={bestProduct ? `TOP: ${bestProduct.name}` : undefined}
              variant="warning"
              icon={<Percent className="w-4 h-4" />}
            />
          </div>

          {/* AI Insights */}
          {stats.trendData.length > 0 && (
            <SalesInsights
              totalRevenue={stats.totalRevenue}
              totalProfit={stats.totalProfit}
              profitMargin={stats.profitMargin}
              totalOrders={stats.totalOrders}
              trendData={stats.trendData}
              topProducts={stats.topProducts}
              byPaymentMethod={stats.byPaymentMethod}
              previousPeriod={stats.previousPeriod}
            />
          )}

          {/* Trend Chart - revenue with gradient */}
          <div className="section-card p-4">
            <SalesSectionHeader icon={BarChart3} title="Tržby v čase" subtitle={PERIODS.find(p => p.value === period)?.label} className="mb-3" />
            {chartData.length > 0 ? (
              <div className="h-[220px] sm:h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <YAxis 
                      yAxisId="left"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      tickFormatter={(value) => value >= 1000 ? `${Math.round(value/1000)}k` : value}
                      width={40}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      hide
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
                              <p className="text-sm font-medium text-foreground">{formatCurrency(payload[0]?.value as number)}</p>
                              <p className="text-xs text-muted-foreground">{payload[1]?.value} prodejů</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                      strokeWidth={2}
                      name="Tržby"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--chart-3))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--chart-3))', r: 2 }}
                      name="Počet"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <SalesEmptyState icon={LineChart} title="Žádná data" description="Za vybrané období nejsou k dispozici žádná data o tržbách" />
            )}
          </div>

          {/* Payment Methods */}
          <div className="section-card p-4">
            <SalesSectionHeader icon={CreditCard} title="Platební metody" className="mb-3" />
            {paymentMethodPieData.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4 items-center">
                <div className="h-[180px] sm:h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethodPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {paymentMethodPieData.map((entry, index) => (
                          <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [formatCurrency(value), '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 min-w-0">
                  {paymentMethodPieData.map((item, index) => {
                    const percentage = stats.totalRevenue > 0 ? Math.round((item.value / stats.totalRevenue) * 100) : 0;
                    return (
                      <div key={item.name} className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                        <span className="text-sm truncate flex-1 min-w-0">{item.name}</span>
                        <span className="text-sm font-semibold tabular-nums shrink-0">{formatCurrency(item.value)}</span>
                        <span className="text-xs text-muted-foreground tabular-nums shrink-0 w-9 text-right">{percentage}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <SalesEmptyState icon={Wallet} title="Žádné platby" description="Za vybrané období nebyly zaznamenány žádné platby" />
            )}
          </div>

          {/* NEW: Heatmap */}
          {stats.hourlyHeatmap.length > 0 && (
            <SalesHeatmap data={stats.hourlyHeatmap} />
          )}

          {/* Category Chart + Margin Trend */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Category Pie Chart */}
            {stats.categoryData && stats.categoryData.length > 0 && (
              <div className="section-card p-4">
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
              <div className="section-card p-4">
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

          {/* NEW: Category Trend */}
          {stats.categoryTrend.length > 1 && (
            <CategoryTrendChart 
              data={stats.categoryTrend} 
              categories={stats.categoryTrendCategories} 
            />
          )}

          {/* Products Bar Chart */}
          <div className="section-card p-4">
            <SalesSectionHeader icon={Package} title="Prodeje podle produktu" subtitle="Klikněte pro detail" className="mb-3" />
            {productBarData.length > 0 ? (
              <div className="h-[260px] sm:h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={productBarData} 
                    layout="vertical"
                    margin={{ left: 0, right: 24 }}
                    onClick={(data) => {
                      if (data?.activePayload?.[0]?.payload) {
                        const p = data.activePayload[0].payload;
                        handleProductClick(p.productId, p.fullName);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis 
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <YAxis 
                      type="category"
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      width={100}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
                              <p className="text-sm font-medium text-foreground">{data.fullName}</p>
                              <p className="text-xs text-foreground">{data.quantity}× prodáno</p>
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
                    >
                      <LabelList dataKey="quantity" position="right" fill="hsl(var(--muted-foreground))" fontSize={11} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <SalesEmptyState icon={Package} title="Žádné produkty" description="Za vybrané období nebyly prodány žádné produkty" />
            )}
          </div>

          {/* NEW: Top Clients */}
          {stats.clientStats.length > 0 && (
            <TopClientsChart data={stats.clientStats} />
          )}

          {/* NEW: AOV Trend */}
          {stats.aovTrend.length > 1 && (
            <div className="section-card p-4">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-medium">Průměrná hodnota objednávky (AOV)</h3>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <RechartsLineChart data={stats.aovTrend}>
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
                    tickFormatter={(v) => `${Math.round(v)} Kč`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload?.length) {
                        return (
                          <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                            <p className="font-medium">{formatCurrency(payload[0].value as number)}</p>
                            <p className="text-xs text-muted-foreground">průměr na objednávku</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="aov"
                    stroke="hsl(var(--chart-4))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-4))', r: 3 }}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* All Products Table */}
          {stats.topProducts.length > 0 && (
            <div className="section-card p-4">
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
