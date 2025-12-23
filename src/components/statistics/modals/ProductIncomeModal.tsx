import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ShoppingBag, Package, TrendingUp, User } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { AnnualStatsData } from '@/hooks/useAnnualStats';

interface ProductIncomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: AnnualStatsData | undefined;
}

export function ProductIncomeModal({ open, onOpenChange, stats }: ProductIncomeModalProps) {
  if (!stats) return null;

  const chartData = stats.topProducts.map(product => ({
    name: product.name.length > 15 ? product.name.substring(0, 15) + '...' : product.name,
    fullName: product.name,
    revenue: product.revenue,
    count: product.count,
  }));

  const totalProducts = stats.topProducts.reduce((sum, p) => sum + p.count, 0);
  const avgProductPrice = totalProducts > 0 ? stats.productIncome / totalProducts : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-warning/10">
              <ShoppingBag className="h-5 w-5 text-warning" />
            </div>
            Příjem z produktů - detail
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Main value */}
          <div className="text-center py-4 bg-warning/5 rounded-xl">
            <p className="text-4xl font-bold text-warning">
              {formatCurrency(stats.productIncome)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">příjem z produktů tento rok</p>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-secondary/50 text-center">
              <Package className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">{totalProducts}</p>
              <p className="text-xs text-muted-foreground">prodáno</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 text-center">
              <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">{formatCurrency(avgProductPrice)}</p>
              <p className="text-xs text-muted-foreground">průměr</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 text-center">
              <ShoppingBag className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">{stats.topProducts.length}</p>
              <p className="text-xs text-muted-foreground">produktů</p>
            </div>
          </div>

          {/* Products chart */}
          {chartData.length > 0 && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={true} vertical={false} />
                  <XAxis 
                    type="number"
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={100}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [formatCurrency(value), 'Tržby']}
                    labelFormatter={(label, payload) => payload[0]?.payload?.fullName || label}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="hsl(var(--warning))" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top buyer */}
          {stats.topClientByProducts && (
            <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium">Top kupující</span>
              </div>
              <p className="text-lg font-bold">{stats.topClientByProducts.name}</p>
              <p className="text-sm text-muted-foreground">
                {stats.topClientByProducts.count}× produktů za {formatCurrency(stats.topClientByProducts.spent)}
              </p>
            </div>
          )}

          {/* Product list */}
          {stats.topProducts && stats.topProducts.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Všechny produkty</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {stats.topProducts.map((product, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-secondary/30">
                    <div>
                      <span className="font-medium">{product.name}</span>
                      <span className="text-muted-foreground ml-2">({product.count}×)</span>
                    </div>
                    <span className="font-medium">{formatCurrency(product.revenue)}</span>
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
