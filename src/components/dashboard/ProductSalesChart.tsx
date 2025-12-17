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
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Package } from 'lucide-react';
import { useDashboardFilters } from '@/contexts/DashboardFiltersContext';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type SalesPeriod = '30days' | '3months' | '6months' | '12months';

interface SalesTrendPoint {
  label: string;
  revenue: number;
  count: number;
}

interface TopProduct {
  name: string;
  count: number;
  revenue: number;
}

interface PaymentMethodBreakdown {
  method: string;
  count: number;
  amount: number;
}

interface ProductSalesChartProps {
  trendData: SalesTrendPoint[];
  topProducts: TopProduct[];
  paymentMethods: PaymentMethodBreakdown[];
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

export function ProductSalesChart({
  trendData,
  topProducts,
  paymentMethods,
  isLoading,
  period,
  onPeriodChange,
}: ProductSalesChartProps) {
  const { filters } = useDashboardFilters();
  
  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-4 sm:p-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  const totalRevenue = trendData.reduce((sum, d) => sum + d.revenue, 0);
  const totalCount = trendData.reduce((sum, d) => sum + d.count, 0);

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
        
        <div className="flex gap-1 p-1 rounded-full bg-secondary/50">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={period === opt.value ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'rounded-full text-xs px-3 h-8',
                period === opt.value && 'bg-primary text-primary-foreground'
              )}
              onClick={() => onPeriodChange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-secondary/30">
          <p className="text-xs text-muted-foreground">Celkový příjem</p>
          <p className="text-lg font-bold text-foreground">
            {totalRevenue.toLocaleString('cs-CZ')} Kč
          </p>
        </div>
        <div className="p-3 rounded-xl bg-secondary/30">
          <p className="text-xs text-muted-foreground">Počet prodejů</p>
          <p className="text-lg font-bold text-foreground">{totalCount}</p>
        </div>
      </div>

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
                formatter={(value: number) => [`${value.toLocaleString('cs-CZ')} Kč`, 'Příjem']}
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

      {/* Bottom section: Top products + Payment methods pie */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border/50">
        {/* Top 5 products */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Top 5 produktů</p>
          <div className="space-y-2">
            {topProducts.slice(0, 5).map((product, index) => (
              <div key={product.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                    {index + 1}
                  </span>
                  <span className="text-foreground truncate max-w-[120px]">{product.name}</span>
                </div>
                <span className="text-muted-foreground">{product.count}×</span>
              </div>
            ))}
            {topProducts.length === 0 && (
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
