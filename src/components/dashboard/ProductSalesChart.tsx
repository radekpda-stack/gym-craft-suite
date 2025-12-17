import { useState, useMemo, useCallback } from 'react';
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
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Package, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { useDashboardFilters } from '@/contexts/DashboardFiltersContext';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { formatCurrency, formatPercent } from '@/lib/formatters';

export type SalesPeriod = '30days' | '3months' | '6months' | '12months';

interface SalesTrendPoint {
  label: string;
  revenue: number;
  count: number;
}

interface TopProduct {
  id: string;
  name: string;
  count: number;
  revenue: number;
  cost: number;
  margin: number;
}

interface PaymentMethodBreakdown {
  method: string;
  count: number;
  amount: number;
}

interface ProductSalesChartProps {
  trendData: SalesTrendPoint[];
  topProducts: TopProduct[];
  allProducts?: TopProduct[];
  paymentMethods: PaymentMethodBreakdown[];
  totalMargin?: number;
  totalRevenue?: number;
  marginPercent?: number;
  isLoading: boolean;
  period: SalesPeriod;
  onPeriodChange: (period: SalesPeriod) => void;
}

const PERIOD_OPTIONS: { value: SalesPeriod; label: string }[] = [
  { value: '30days', label: '30 dní' },
  { value: '3months', label: '3 měs.' },
  { value: '6months', label: '6 měs.' },
  { value: '12months', label: '12 měs.' },
];

const PAYMENT_COLORS = [
  'hsl(var(--success))',
  'hsl(var(--primary))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
];

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Hotově',
  credit: 'Kredit',
  card: 'Karta',
  bank: 'Převod',
  paid_cash: 'Hotově',
  paid_credit: 'Kredit',
  paid_card: 'Karta',
  paid_bank: 'Převod',
};

const PRODUCT_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(var(--secondary-foreground))',
];

export function ProductSalesChart({
  trendData,
  topProducts,
  allProducts = [],
  paymentMethods,
  totalMargin = 0,
  totalRevenue = 0,
  marginPercent = 0,
  isLoading,
  period,
  onPeriodChange,
}: ProductSalesChartProps) {
  const { filters } = useDashboardFilters();
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showProductSelector, setShowProductSelector] = useState(false);
  
  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-4 sm:p-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  // Memoize filtered products based on selection
  const displayProducts = useMemo(() => 
    selectedProducts.length > 0
      ? allProducts.filter(p => selectedProducts.includes(p.id))
      : topProducts,
    [selectedProducts, allProducts, topProducts]
  );

  // Memoize computed totals
  const { filteredTotalRevenue, filteredTotalMargin, filteredMarginPercent, totalCount } = useMemo(() => {
    const revenue = displayProducts.reduce((sum, p) => sum + p.revenue, 0);
    const margin = displayProducts.reduce((sum, p) => sum + p.margin, 0);
    const count = displayProducts.reduce((sum, p) => sum + p.count, 0);
    const marginPercent = revenue > 0 ? (margin / revenue) * 100 : 0;
    return { filteredTotalRevenue: revenue, filteredTotalMargin: margin, filteredMarginPercent: marginPercent, totalCount: count };
  }, [displayProducts]);

  const toggleProduct = useCallback((productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }, []);

  const clearSelection = useCallback(() => setSelectedProducts([]), []);

  return (
    <div className="glass rounded-2xl p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg sm:text-xl font-bold text-foreground">
            Prodeje produktů
          </h3>
          {filters.clientIds.length > 0 && (
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs">
                    {filters.clientIds.length} klient{filters.clientIds.length > 1 ? 'ů' : ''}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Filtrováno podle vybraných klientů</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          )}
        </div>
        
        <div className="flex gap-1 p-1 rounded-full bg-secondary/50 overflow-x-auto scrollbar-hide">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={period === opt.value ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'rounded-full text-[10px] sm:text-xs px-2 sm:px-3 h-7 sm:h-8 flex-shrink-0',
                period === opt.value && 'bg-primary text-primary-foreground'
              )}
              onClick={() => onPeriodChange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary stats with margin */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <div className="p-2 sm:p-3 rounded-xl bg-secondary/30">
          <p className="text-[10px] sm:text-xs text-muted-foreground">Příjem</p>
          <p className="text-base sm:text-lg font-bold text-foreground">
            {formatCurrency(filteredTotalRevenue)}
          </p>
        </div>
        <div className="p-2 sm:p-3 rounded-xl bg-secondary/30">
          <p className="text-[10px] sm:text-xs text-muted-foreground">Prodejů</p>
          <p className="text-base sm:text-lg font-bold text-foreground">{totalCount}</p>
        </div>
        <div className="p-2 sm:p-3 rounded-xl bg-success/10 border border-success/20">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-success" />
            <p className="text-[10px] sm:text-xs text-success">Marže</p>
          </div>
          <p className="text-base sm:text-lg font-bold text-success">
            {formatCurrency(filteredTotalMargin)}
          </p>
        </div>
        <div className="p-2 sm:p-3 rounded-xl bg-secondary/30">
          <p className="text-[10px] sm:text-xs text-muted-foreground">Marže %</p>
          <p className="text-base sm:text-lg font-bold text-foreground">{formatPercent(filteredMarginPercent, 1)}</p>
        </div>
      </div>

      {/* Product selector */}
      <Collapsible open={showProductSelector} onOpenChange={setShowProductSelector}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between text-xs">
            <span className="flex items-center gap-2">
              <Package className="w-3.5 h-3.5" />
              {selectedProducts.length > 0 
                ? `Vybráno ${selectedProducts.length} produkt${selectedProducts.length > 1 ? 'ů' : ''}`
                : 'Vybrat produkty'
              }
            </span>
            {showProductSelector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 rounded-lg bg-secondary/20">
            {allProducts.map((product) => (
              <label
                key={product.id}
                className="flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded hover:bg-secondary/50"
              >
                <Checkbox
                  checked={selectedProducts.includes(product.id)}
                  onCheckedChange={() => toggleProduct(product.id)}
                />
                <span className="truncate">{product.name}</span>
                <span className="text-muted-foreground ml-auto">{product.count}×</span>
              </label>
            ))}
          </div>
          {selectedProducts.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearSelection} className="mt-2 text-xs">
              Zrušit výběr
            </Button>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Trend chart */}
      {trendData.length > 0 ? (
        <div className="h-40 sm:h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                }}
                formatter={(value: number) => [formatCurrency(value), 'Příjem']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#salesGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-40 flex items-center justify-center text-muted-foreground">
          Žádná data k zobrazení
        </div>
      )}

      {/* Bottom section: Products with margin + Payment methods pie */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border/50">
        {/* Products with margin */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            {selectedProducts.length > 0 ? 'Vybrané produkty' : 'Top 5 produktů'} (s marží)
          </p>
          <div className="space-y-2">
            {displayProducts.slice(0, 5).map((product, index) => (
              <div key={product.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium flex-shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-foreground truncate">{product.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-muted-foreground text-xs">{product.count}×</span>
                  <span className={cn(
                    "text-xs font-medium",
                    product.margin >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {product.margin >= 0 ? '+' : ''}{formatCurrency(product.margin)}
                  </span>
                </div>
              </div>
            ))}
            {displayProducts.length === 0 && (
              <p className="text-sm text-muted-foreground">Žádné produkty</p>
            )}
          </div>
        </div>

        {/* Payment methods pie */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Způsob platby</p>
          {paymentMethods.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="w-20 h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethods}
                      cx="50%"
                      cy="50%"
                      innerRadius={20}
                      outerRadius={35}
                      dataKey="count"
                    >
                      {paymentMethods.map((_, index) => (
                        <Cell key={index} fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 flex-1">
                {paymentMethods.map((pm, index) => (
                  <div key={pm.method} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: PAYMENT_COLORS[index % PAYMENT_COLORS.length] }}
                    />
                    <span className="text-muted-foreground">
                      {PAYMENT_LABELS[pm.method] || pm.method}
                    </span>
                    <span className="text-foreground font-medium ml-auto">{pm.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
              <Package className="w-4 h-4 mr-2" />
              Žádné platby
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
