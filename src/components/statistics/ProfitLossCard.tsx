import { useAnnualStats } from '@/hooks/useAnnualStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { Receipt, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import type { StatsPeriodRange } from './StatsPeriodSelector';

interface ProfitLossCardProps {
  periodRange?: StatsPeriodRange;
}

export function ProfitLossCard({ periodRange }: ProfitLossCardProps) {
  const { data: stats, isLoading: statsLoading } = useAnnualStats(
    periodRange?.type === 'all' ? 'all' : periodRange?.type === 'custom' || periodRange ? 'custom' : 'year',
    periodRange?.start,
    periodRange?.end
  );

  // Fetch expenses for the period
  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ['period-expenses', periodRange?.start?.toISOString(), periodRange?.end?.toISOString()],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { total: 0 };

      let query = supabase
        .from('business_expenses')
        .select('amount')
        .eq('user_id', user.id);

      if (periodRange?.start) {
        query = query.gte('date', format(periodRange.start, 'yyyy-MM-dd'));
      }
      if (periodRange?.end) {
        query = query.lte('date', format(periodRange.end, 'yyyy-MM-dd'));
      }

      const { data } = await query;
      const total = (data || []).reduce((s, e) => s + e.amount, 0);
      return { total };
    },
  });

  const isLoading = statsLoading || expensesLoading;

  if (isLoading) {
    return <Skeleton className="h-40 rounded-xl" />;
  }

  if (!stats) return null;

  const totalIncome = stats.totalIncome || 0;
  const trainingIncome = stats.trainingIncome || 0;
  const productIncome = stats.productIncome || 0;
  const totalExpenses = expenses?.total || 0;
  const profit = totalIncome - totalExpenses;
  const margin = totalIncome > 0 ? Math.round((profit / totalIncome) * 100) : 0;

  return (
    <Card className={cn(
      'relative overflow-hidden',
      'bg-card/80 backdrop-blur-md',
      'border-border/50 shadow-sm'
    )}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      
      <CardHeader className="relative pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Receipt className="h-4 w-4 text-primary" />
          </div>
          Zisk za období
        </CardTitle>
      </CardHeader>
      
      <CardContent className="relative">
        <div className="space-y-2">
          {/* Income breakdown */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Tréninky</span>
            <span className="font-medium tabular-nums">{formatCurrency(trainingIncome)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Produkty</span>
            <span className="font-medium tabular-nums">{formatCurrency(productIncome)}</span>
          </div>
          
          <div className="border-t border-border/50 my-1" />
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Příjmy celkem</span>
            <span className="font-semibold tabular-nums">{formatCurrency(totalIncome)}</span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Náklady</span>
            <span className="font-medium tabular-nums text-destructive">
              −{formatCurrency(totalExpenses)}
            </span>
          </div>
          
          <div className="border-t-2 border-border my-1" />
          
          {/* Profit */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold">Čistý zisk</span>
            <span className="text-lg font-bold tabular-nums">{formatCurrency(profit)}</span>
          </div>
          
          {/* Margin */}
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Marže</span>
            <span className="tabular-nums">{margin}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
