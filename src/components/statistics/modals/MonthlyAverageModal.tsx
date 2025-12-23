import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendingUp, Calendar, ArrowUp, ArrowDown } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { AnnualStatsData } from '@/hooks/useAnnualStats';

interface MonthlyAverageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: AnnualStatsData | undefined;
}

export function MonthlyAverageModal({ open, onOpenChange, stats }: MonthlyAverageModalProps) {
  if (!stats) return null;

  const chartData = stats.monthlyTrend.map(item => ({
    ...item,
    formattedIncome: formatCurrency(item.income),
  }));

  // Find best and worst months
  const sortedMonths = [...stats.monthlyTrend].sort((a, b) => b.income - a.income);
  const bestMonth = sortedMonths[0];
  const worstMonth = sortedMonths[sortedMonths.length - 1];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            Měsíční průměr - detail
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Main value */}
          <div className="text-center py-4 bg-primary/5 rounded-xl">
            <p className="text-4xl font-bold text-primary">
              {formatCurrency(stats.avgMonthlyIncome)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">průměrný měsíční příjem</p>
          </div>

          {/* Monthly chart */}
          {chartData.length > 0 && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Příjem']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="income" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Best & Worst months */}
          <div className="grid grid-cols-2 gap-3">
            {bestMonth && (
              <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUp className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium">Nejlepší měsíc</span>
                </div>
                <p className="text-lg font-bold">{bestMonth.label}</p>
                <p className="text-sm text-success">{formatCurrency(bestMonth.income)}</p>
              </div>
            )}
            {worstMonth && worstMonth !== bestMonth && (
              <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDown className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium">Nejslabší měsíc</span>
                </div>
                <p className="text-lg font-bold">{worstMonth.label}</p>
                <p className="text-sm text-destructive">{formatCurrency(worstMonth.income)}</p>
              </div>
            )}
          </div>

          {/* Summary stats */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm p-2 rounded bg-secondary/30">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Celkem měsíců</span>
              </div>
              <span className="font-medium">{stats.monthlyTrend.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm p-2 rounded bg-secondary/30">
              <span>Celkový příjem</span>
              <span className="font-medium">{formatCurrency(stats.totalIncome)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
