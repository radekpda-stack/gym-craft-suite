import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DollarSign, TrendingUp, Dumbbell, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { AnnualStatsData } from '@/hooks/useAnnualStats';

interface TotalIncomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: AnnualStatsData | undefined;
}

export function TotalIncomeModal({ open, onOpenChange, stats }: TotalIncomeModalProps) {
  if (!stats) return null;

  const pieData = [
    { name: 'Tréninky', value: stats.trainingIncome, color: 'hsl(var(--primary))' },
    { name: 'Produkty', value: stats.productIncome, color: 'hsl(var(--warning))' },
  ].filter(item => item.value > 0);

  const trainingPercent = stats.totalIncome > 0 
    ? ((stats.trainingIncome / stats.totalIncome) * 100).toFixed(1) 
    : '0';
  const productPercent = stats.totalIncome > 0 
    ? ((stats.productIncome / stats.totalIncome) * 100).toFixed(1) 
    : '0';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-success/10">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            Celkový příjem - detail
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Main value */}
          <div className="text-center py-4 bg-success/5 rounded-xl">
            <p className="text-4xl font-bold text-success">
              {formatCurrency(stats.totalIncome)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">celkový příjem tento rok</p>
          </div>

          {/* Pie chart */}
          {pieData.length > 0 && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Dumbbell className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Z tréninků</span>
              </div>
              <p className="text-xl font-bold">{formatCurrency(stats.trainingIncome)}</p>
              <p className="text-xs text-muted-foreground">{trainingPercent}% z celku</p>
            </div>
            <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium">Z produktů</span>
              </div>
              <p className="text-xl font-bold">{formatCurrency(stats.productIncome)}</p>
              <p className="text-xs text-muted-foreground">{productPercent}% z celku</p>
            </div>
          </div>

          {/* Monthly average */}
          <div className="p-4 rounded-lg bg-secondary/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Měsíční průměr</span>
            </div>
            <span className="font-bold">{formatCurrency(stats.avgMonthlyIncome)}</span>
          </div>

          {/* Top products */}
          {stats.topProducts && stats.topProducts.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Top 5 produktů</h4>
              <div className="space-y-2">
                {stats.topProducts.map((product, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-secondary/30">
                    <span>{i + 1}. {product.name}</span>
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
