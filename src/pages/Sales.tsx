import { useState, useMemo } from 'react';
import { CreditCard, Package, BarChart3, History, ShoppingCart, TrendingUp, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { SalesRegister } from '@/components/sales/SalesRegister';
import { StockManagement } from '@/components/sales/StockManagement';
import { SalesStatistics } from '@/components/sales/SalesStatistics';
import { SalesHistory } from '@/components/sales/SalesHistory';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { useProducts } from '@/hooks/useProducts';
import { useSalesStats } from '@/hooks/useSalesStats';
import { useSalesSmartTips } from '@/hooks/useSalesSmartTips'; // todayTotal, yesterdayTotal
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const TABS = [
  { value: 'register', label: 'Pokladna', icon: CreditCard },
  { value: 'history', label: 'Historie', icon: History },
  { value: 'stock', label: 'Sklad', icon: Package },
  { value: 'stats', label: 'Statistiky', icon: BarChart3 },
];

export default function Sales() {
  usePageTracking('sales');
  const [activeTab, setActiveTab] = useState('register');
  
  // Get stats for hero KPIs
  const { data: salesStats } = useSalesStats();
  const { data: products = [] } = useProducts();
  const { todayTotal, yesterdayTotal } = useSalesSmartTips();
  
  // Calculate low stock count
  const lowStockCount = useMemo(() => {
    return products.filter(p => 
      p.is_active && 
      p.kind === 'inventory' && 
      p.stock_quantity <= p.low_stock_threshold
    ).length;
  }, [products]);

  // Today vs yesterday change
  const todayChange = yesterdayTotal > 0 
    ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 
    : null;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Compact Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-transparent p-3 sm:p-5">
        <div className="relative flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/15 shrink-0">
            <ShoppingCart className="w-6 h-6 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-foreground">Prodej</h1>
            {/* Inline KPI chips */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="text-xs font-medium text-muted-foreground">
                Dnes: <span className="text-foreground font-bold">{formatCurrency(todayTotal)}</span>
                {todayChange !== null && Math.abs(todayChange) >= 5 && (
                  <span className={cn(
                    "ml-1 text-[10px] font-bold",
                    todayChange > 0 ? "text-success" : "text-destructive"
                  )}>
                    {todayChange > 0 ? '+' : ''}{todayChange.toFixed(0)}%
                  </span>
                )}
              </span>
              <span className="text-border">·</span>
              <span className="text-xs text-muted-foreground">
                Měsíc: <span className="text-foreground font-medium">{formatCurrency(salesStats?.totalRevenue || 0)}</span>
              </span>
              {lowStockCount > 0 && (
                <>
                  <span className="text-border">·</span>
                  <span className="text-xs text-warning font-medium">
                    <AlertTriangle className="w-3 h-3 inline mr-0.5" />
                    {lowStockCount} nízký sklad
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Premium Floating Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full h-auto p-1.5 card-floating rounded-2xl mb-4 sm:mb-6 backdrop-blur-md overflow-hidden">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "relative flex-1 gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl transition-all min-w-0",
                  "text-muted-foreground hover:text-foreground/80",
                  isActive && "text-primary-foreground bg-primary shadow-md"
                )}
              >
                <div className={cn(
                  "p-1 sm:p-1.5 rounded-lg transition-colors shrink-0",
                  isActive ? "bg-primary-foreground/20" : "bg-transparent"
                )}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="hidden sm:inline text-xs sm:text-sm font-medium truncate">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="register" className="mt-0">
          <SalesRegister />
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <SalesHistory />
        </TabsContent>

        <TabsContent value="stock" className="mt-0">
          <StockManagement />
        </TabsContent>

        <TabsContent value="stats" className="mt-0">
          <SalesStatistics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
