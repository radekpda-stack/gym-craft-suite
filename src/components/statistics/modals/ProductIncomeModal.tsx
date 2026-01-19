import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ShoppingBag, Package, TrendingUp, User, Crown, BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { AnnualStatsData } from '@/hooks/useAnnualStats';

interface ProductIncomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: AnnualStatsData | undefined;
}

export function ProductIncomeModal({ open, onOpenChange, stats }: ProductIncomeModalProps) {
  if (!stats) return null;

  const totalProductsSold = stats.topProducts.reduce((sum, p) => sum + p.count, 0);
  const avgProductPrice = totalProductsSold > 0 ? stats.productIncome / totalProductsSold : 0;
  const uniqueProductsCount = stats.topProducts.length;

  // Sort by count for best-seller, by revenue for chart
  const sortedByCount = [...stats.topProducts].sort((a, b) => b.count - a.count);
  const bestSeller = sortedByCount[0];

  // Top 5 products by revenue for chart
  const chartData = stats.topProducts
    .slice(0, 5)
    .map(product => ({
      name: product.name.length > 20 ? product.name.substring(0, 20) + '...' : product.name,
      fullName: product.name,
      revenue: product.revenue,
      count: product.count,
    }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-warning/10">
              <ShoppingBag className="h-5 w-5 text-warning" />
            </div>
            Statistiky produktů
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Main value */}
          <div className="text-center py-4 bg-warning/5 rounded-xl">
            <p className="text-4xl font-bold text-warning">
              {formatCurrency(stats.productIncome)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">celkový příjem z produktů</p>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-secondary/50 text-center">
              <Package className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">{totalProductsSold}</p>
              <p className="text-xs text-muted-foreground">prodáno ks</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 text-center">
              <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">{formatCurrency(avgProductPrice)}</p>
              <p className="text-xs text-muted-foreground">průměr/ks</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 text-center">
              <BarChart3 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">{uniqueProductsCount}</p>
              <p className="text-xs text-muted-foreground">druhů</p>
            </div>
          </div>

          {/* Best seller */}
          {bestSeller && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium text-warning">Nejprodávanější produkt</span>
              </div>
              <p className="text-lg font-bold">{bestSeller.name}</p>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span>{bestSeller.count}× prodáno</span>
                <span>•</span>
                <span>{formatCurrency(bestSeller.revenue)} tržby</span>
              </div>
            </div>
          )}

          {/* Products chart - top 5 by revenue */}
          {chartData.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Top 5 podle tržeb
              </h4>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={true} vertical={false} />
                    <XAxis 
                      type="number"
                      tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : String(value)}
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={90}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Tržby']}
                      labelFormatter={(label, payload) => payload[0]?.payload?.fullName || label}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                      {chartData.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`}
                          fill={index === 0 ? 'hsl(var(--warning))' : 'hsl(var(--warning) / 0.6)'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Top buyer */}
          {stats.topClientByProducts && (
            <div className="p-4 rounded-lg bg-secondary/30 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Top kupující</span>
              </div>
              <p className="text-base font-bold">{stats.topClientByProducts.name}</p>
              <p className="text-sm text-muted-foreground">
                {stats.topClientByProducts.count}× produktů za {formatCurrency(stats.topClientByProducts.spent)}
              </p>
            </div>
          )}

          {/* All products list */}
          {stats.topProducts && stats.topProducts.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                Přehled všech produktů ({uniqueProductsCount})
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {stats.topProducts.map((product, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between text-sm p-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <span className="font-medium block truncate">{product.name}</span>
                      <span className="text-xs text-muted-foreground">{product.count}× prodáno</span>
                    </div>
                    <span className="font-semibold text-warning whitespace-nowrap">
                      {formatCurrency(product.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
