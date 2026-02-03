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
  
  // Calculate low stock count
  const lowStockCount = useMemo(() => {
    return products.filter(p => 
      p.is_active && 
      p.kind === 'inventory' && 
      p.stock_quantity <= p.low_stock_threshold
    ).length;
  }, [products]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in pb-24 sm:pb-6">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5 sm:p-6">
        {/* Background glow effects */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-accent/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative flex items-start gap-4">
          {/* Icon with glow */}
          <div className="p-3 rounded-2xl bg-primary/20 backdrop-blur-sm shadow-lg shadow-primary/20 shrink-0">
            <ShoppingCart className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Prodej</h1>
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
              Pokladna, sklad a statistiky na jednom místě
            </p>
            
            {/* Mini KPI chips */}
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="outline" className="gap-1.5 bg-card/60 backdrop-blur-sm border-border/50 py-1 px-2.5">
                <TrendingUp className="w-3 h-3 text-success" />
                <span className="text-xs font-medium">Měsíc: {formatCurrency(salesStats?.totalRevenue || 0)}</span>
              </Badge>
              <Badge variant="outline" className="gap-1.5 bg-card/60 backdrop-blur-sm border-border/50 py-1 px-2.5">
                <ShoppingCart className="w-3 h-3 text-primary" />
                <span className="text-xs font-medium">{salesStats?.totalSales || 0} prodejů</span>
              </Badge>
              {lowStockCount > 0 && (
                <Badge variant="outline" className="gap-1.5 bg-warning/10 text-warning border-warning/30 py-1 px-2.5">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="text-xs font-medium">{lowStockCount} low stock</span>
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Premium Floating Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full h-auto p-1.5 card-floating rounded-2xl mb-4 sm:mb-6 backdrop-blur-md">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "relative flex-1 gap-2 py-3 px-3 sm:px-4 rounded-xl transition-all",
                  "text-muted-foreground hover:text-foreground/80",
                  isActive && "text-primary-foreground bg-primary shadow-md"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  isActive ? "bg-primary-foreground/20" : "bg-transparent"
                )}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="hidden xs:inline text-sm font-medium">{tab.label}</span>
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
