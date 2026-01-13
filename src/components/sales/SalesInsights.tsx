import { useMemo } from 'react';
import { 
  Lightbulb, 
  TrendingUp, 
  TrendingDown, 
  Trophy, 
  CalendarDays,
  CreditCard,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface InsightData {
  icon: React.ElementType;
  color: string;
  title: string;
  description: string;
}

interface SalesInsightsProps {
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  totalOrders: number;
  trendData: Array<{ date: string; revenue: number; count: number; profit: number }>;
  topProducts: Array<{ name: string; quantity: number; revenue: number; margin: number }>;
  byPaymentMethod: Record<string, { count: number; revenue: number }>;
  previousPeriod?: {
    totalRevenue: number;
    totalProfit: number;
    totalOrders: number;
  };
}

export function SalesInsights({
  totalRevenue,
  totalProfit,
  profitMargin,
  totalOrders,
  trendData,
  topProducts,
  byPaymentMethod,
  previousPeriod,
}: SalesInsightsProps) {
  const insights = useMemo(() => {
    const result: InsightData[] = [];
    
    // 1. Best selling day
    if (trendData.length > 0) {
      const bestDay = [...trendData].sort((a, b) => b.revenue - a.revenue)[0];
      if (bestDay && bestDay.revenue > 0) {
        const dayDate = new Date(bestDay.date);
        const dayFormatted = format(dayDate, 'EEEE d.M.', { locale: cs });
        result.push({
          icon: CalendarDays,
          color: 'text-primary',
          title: `${dayFormatted.charAt(0).toUpperCase() + dayFormatted.slice(1)} byl nejlepší den`,
          description: `Tržby ${formatCurrency(bestDay.revenue)} z ${bestDay.count} prodejů`,
        });
      }
    }
    
    // 2. Top product
    if (topProducts.length > 0) {
      const top = topProducts[0];
      result.push({
        icon: Trophy,
        color: 'text-warning',
        title: `Bestseller: ${top.name}`,
        description: `${top.quantity}× prodáno, tržby ${formatCurrency(top.revenue)}`,
      });
    }
    
    // 3. Revenue trend (comparing first half vs second half of period)
    if (trendData.length >= 4) {
      const mid = Math.floor(trendData.length / 2);
      const firstHalf = trendData.slice(0, mid).reduce((sum, d) => sum + d.revenue, 0);
      const secondHalf = trendData.slice(mid).reduce((sum, d) => sum + d.revenue, 0);
      
      if (firstHalf > 0 && secondHalf > 0) {
        const change = ((secondHalf - firstHalf) / firstHalf) * 100;
        
        if (Math.abs(change) >= 10) {
          const isGrowing = change > 0;
          result.push({
            icon: isGrowing ? TrendingUp : TrendingDown,
            color: isGrowing ? 'text-success' : 'text-destructive',
            title: isGrowing ? 'Tržby rostou' : 'Tržby klesají',
            description: `${isGrowing ? '+' : ''}${change.toFixed(0)}% oproti začátku období`,
          });
        }
      }
    }
    
    // 4. Period comparison
    if (previousPeriod && previousPeriod.totalRevenue > 0) {
      const revenueChange = ((totalRevenue - previousPeriod.totalRevenue) / previousPeriod.totalRevenue) * 100;
      
      if (Math.abs(revenueChange) >= 5) {
        const isGrowing = revenueChange > 0;
        result.push({
          icon: isGrowing ? Sparkles : AlertTriangle,
          color: isGrowing ? 'text-success' : 'text-warning',
          title: isGrowing ? 'Lepší než minule!' : 'Horší než minule',
          description: `${isGrowing ? '+' : ''}${revenueChange.toFixed(0)}% oproti předchozímu období`,
        });
      }
    }
    
    // 5. Margin warning
    if (profitMargin < 20 && profitMargin > 0) {
      result.push({
        icon: AlertTriangle,
        color: 'text-warning',
        title: 'Nízká marže',
        description: `Průměrná marže jen ${profitMargin.toFixed(1)}% - zkontrolujte nákupní ceny`,
      });
    }
    
    // 6. Dominant payment method
    const totalPayments = Object.values(byPaymentMethod).reduce((sum, m) => sum + m.count, 0);
    if (totalPayments > 0) {
      const dominant = Object.entries(byPaymentMethod)
        .filter(([_, data]) => data.count > 0)
        .sort((a, b) => b[1].count - a[1].count)[0];
      
      if (dominant) {
        const percentage = ((dominant[1].count / totalPayments) * 100).toFixed(0);
        const methodLabel = {
          cash: 'hotově',
          card: 'kartou', 
          bank: 'převodem',
          credit: 'kreditem',
        }[dominant[0]] || dominant[0];
        
        if (Number(percentage) >= 60) {
          result.push({
            icon: CreditCard,
            color: 'text-muted-foreground',
            title: `${percentage}% plateb ${methodLabel}`,
            description: `${dominant[1].count} z ${totalPayments} transakcí`,
          });
        }
      }
    }
    
    return result.slice(0, 4); // Max 4 insights
  }, [trendData, topProducts, byPaymentMethod, totalRevenue, profitMargin, previousPeriod]);

  if (insights.length === 0) return null;

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-4 h-4 text-warning" />
        <h3 className="font-medium">Postřehy</h3>
      </div>
      
      <div className="grid sm:grid-cols-2 gap-3">
        {insights.map((insight, index) => {
          const Icon = insight.icon;
          return (
            <div 
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30"
            >
              <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", insight.color)} />
              <div className="min-w-0">
                <p className="font-medium text-sm">{insight.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {insight.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
