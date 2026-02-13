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
  LineChart,
  CalendarDays
} from 'lucide-react';
import { format, subDays, subMonths, startOfDay, startOfMonth, getDay, getHours } from 'date-fns';
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
import { SalesInsights } from './SalesInsights';
import { ComparisonBadge } from './ComparisonBadge';
import { SalesHeatmap } from './SalesHeatmap';
import { TopClientsChart } from './TopClientsChart';
import { CategoryTrendChart } from './CategoryTrendChart';

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
          {/* KPI Cards - 5 main metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Tržby */}
            <div className={cn(
              "relative overflow-hidden rounded-xl p-4",
              "bg-card/80 backdrop-blur-md",
              "border border-primary/20 shadow-sm",
              "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            )}>
              <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-primary/20 to-transparent" />
              <div className="relative">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest">Tržby celkem</span>
                </div>
                <p className="text-2xl font-bold text-primary tabular-nums">{formatCurrency(stats.totalRevenue)}</p>
                <div className="flex items-center gap-2 mt-1">
                  {stats.previousPeriod ? (
                    <ComparisonBadge 
                      currentValue={stats.totalRevenue}
                      previousValue={stats.previousPeriod.totalRevenue}
                    />
                  ) : (
                    <span className="text-[10px] text-muted-foreground">{PERIODS.find(p => p.value === period)?.label}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Náklady */}
            <div className={cn(
              "relative overflow-hidden rounded-xl p-4",
              "bg-card/80 backdrop-blur-md",
              "border border-border/50 shadow-sm",
              "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            )}>
              <div className="relative">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <div className="p-1.5 rounded-lg bg-muted/50">
                    <TrendingDown className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest">Náklady</span>
                </div>
                <p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(stats.totalCosts)}</p>
                <div className="flex items-center gap-2 mt-1">
                  {stats.previousPeriod ? (
                    <ComparisonBadge 
                      currentValue={stats.totalCosts}
                      previousValue={stats.previousPeriod.totalCosts}
                      invert
                    />
                  ) : (
                    <span className="text-[10px] text-muted-foreground">nákupní ceny</span>
                  )}
                </div>
              </div>
            </div>

            {/* Čistý zisk */}
            <div className={cn(
              "relative overflow-hidden rounded-xl p-4",
              "bg-card/80 backdrop-blur-md",
              "border border-emerald-500/30 shadow-sm shadow-emerald-500/10",
              "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            )}>
              <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-emerald-500/20 to-transparent" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10">
                    <Banknote className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-emerald-600 font-medium">Čistý zisk</span>
                </div>
                <p className={cn(
                  "text-2xl font-bold tabular-nums",
                  stats.totalProfit >= 0 ? "text-emerald-500" : "text-destructive"
                )}>
                  {formatCurrency(stats.totalProfit)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {stats.previousPeriod ? (
                    <ComparisonBadge 
                      currentValue={stats.totalProfit}
                      previousValue={stats.previousPeriod.totalProfit}
                    />
                  ) : (
                    <span className="text-[10px] text-muted-foreground">marže {stats.profitMargin.toFixed(1)}%</span>
                  )}
                </div>
              </div>
            </div>

            {/* Počet prodejů */}
            <div className={cn(
              "relative overflow-hidden rounded-xl p-4",
              "bg-card/80 backdrop-blur-md",
              "border border-accent/20 shadow-sm",
              "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            )}>
              <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-accent/20 to-transparent" />
              <div className="relative">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <div className="p-1.5 rounded-lg bg-accent/10">
                    <ShoppingCart className="w-4 h-4 text-accent" />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest">Počet prodejů</span>
                </div>
                <p className="text-2xl font-bold text-foreground tabular-nums">{stats.totalOrders}</p>
                <div className="flex items-center gap-2 mt-1">
                  {stats.previousPeriod ? (
                    <ComparisonBadge 
                      currentValue={stats.totalOrders}
                      previousValue={stats.previousPeriod.totalOrders}
                    />
                  ) : (
                    <span className="text-[10px] text-muted-foreground">transakcí</span>
                  )}
                </div>
              </div>
            </div>

            {/* NEW: Průměr / den */}
            <div className={cn(
              "relative overflow-hidden rounded-xl p-4",
              "bg-card/80 backdrop-blur-md",
              "border border-chart-2/20 shadow-sm",
              "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
              "col-span-2 lg:col-span-1"
            )}>
              <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-chart-2/20 to-transparent" />
              <div className="relative">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <div className="p-1.5 rounded-lg bg-chart-2/10">
                    <CalendarDays className="w-4 h-4 text-chart-2" />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest">Průměr / den</span>
                </div>
                <p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(stats.avgPerDay)}</p>
                <span className="text-[10px] text-muted-foreground">{stats.activeDays} aktivních dnů</span>
              </div>
            </div>
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

          {/* Trend Chart - Dual axis: revenue + count */}
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
                    yAxisId="left"
                    className="text-xs fill-muted-foreground"
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => value >= 1000 ? `${Math.round(value/1000)}k` : value}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    className="text-xs fill-muted-foreground"
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="glass rounded-lg p-2 border border-border">
                            <p className="text-sm font-medium">{formatCurrency(payload[0]?.value as number)}</p>
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
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Žádná data za vybrané období
              </div>
            )}
          </div>

          {/* Payment Methods */}
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

          {/* NEW: Heatmap */}
          {stats.hourlyHeatmap.length > 0 && (
            <SalesHeatmap data={stats.hourlyHeatmap} />
          )}

          {/* Category Chart + Margin Trend */}
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

          {/* NEW: Category Trend */}
          {stats.categoryTrend.length > 1 && (
            <CategoryTrendChart 
              data={stats.categoryTrend} 
              categories={stats.categoryTrendCategories} 
            />
          )}

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

          {/* NEW: Top Clients */}
          {stats.clientStats.length > 0 && (
            <TopClientsChart data={stats.clientStats} />
          )}

          {/* NEW: AOV Trend */}
          {stats.aovTrend.length > 1 && (
            <div className="glass rounded-xl p-4">
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
