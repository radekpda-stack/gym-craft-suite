import { Link } from 'react-router-dom';
import { Receipt, TrendingDown, TrendingUp, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useExpenseStats } from '@/hooks/useExpenseStats';
import { getCategoryInfo } from '@/hooks/useBusinessExpenses';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(amount);
}

export function OperatingExpensesCard() {
  const { data: stats, isLoading } = useExpenseStats();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Provozní náklady
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  const topCategories = stats?.byCategory.slice(0, 3) || [];
  const monthlyChange = stats?.monthlyChange || 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          Provozní náklady
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="text-2xl font-bold">
            {formatCurrency(stats?.totalThisMonth || 0)}
          </div>
          <div className="text-xs text-muted-foreground">tento měsíc</div>
        </div>

        {monthlyChange !== 0 && (
          <div className={`flex items-center gap-1 text-xs ${monthlyChange > 0 ? 'text-destructive' : 'text-green-600'}`}>
            {monthlyChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(monthlyChange)}% vs minulý měsíc
          </div>
        )}

        {topCategories.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t">
            <div className="text-xs text-muted-foreground">Top kategorie</div>
            {topCategories.map((cat) => {
              const info = getCategoryInfo(cat.category);
              return (
                <div key={cat.category} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <span>{info.icon}</span>
                    <span className="truncate">{info.label}</span>
                  </span>
                  <span className="text-muted-foreground">{formatCurrency(cat.amount)}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-2">
          <Link to="/expenses">
            <Button variant="ghost" size="sm" className="w-full gap-2">
              Detail nákladů
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
