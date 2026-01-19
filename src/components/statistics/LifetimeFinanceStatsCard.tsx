import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAnnualStats } from '@/hooks/useAnnualStats';
import { formatCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  Dumbbell, 
  CreditCard, 
  TrendingUp,
  ShoppingBag,
  Banknote,
} from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

export function LifetimeFinanceStatsCard() {
  const { data: stats, isLoading } = useAnnualStats('all');

  if (isLoading) {
    return <Skeleton className="h-[200px] rounded-xl" />;
  }

  if (!stats) {
    return null;
  }

  // Calculate stats
  const totalMonths = stats.totalDays ? Math.max(1, Math.round(stats.totalDays / 30)) : 1;
  const avgMonthlyTrainings = Math.round(stats.completedTrainings / totalMonths);
  const avgMonthlyReceived = stats.receivedCredit / totalMonths;
  const avgMonthlyEarned = stats.totalIncome / totalMonths;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Celková statistika (od začátku)
        </CardTitle>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Celkem {stats.totalDays} dní v aplikaci
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Total Received Credit */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5" />
              <span className="text-xs">Přijatý kredit</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(stats.receivedCredit)}</p>
            <p className="text-xs text-muted-foreground">
              Ø {formatCurrency(avgMonthlyReceived)}/měsíc
            </p>
          </div>

          {/* Total Earned */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Banknote className="h-3.5 w-3.5" />
              <span className="text-xs">Odtrénováno</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(stats.totalIncome)}</p>
            <p className="text-xs text-muted-foreground">
              Ø {formatCurrency(avgMonthlyEarned)}/měsíc
            </p>
          </div>

          {/* Total Trainings */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Dumbbell className="h-3.5 w-3.5" />
              <span className="text-xs">Tréninků celkem</span>
            </div>
            <p className="text-lg font-bold">{stats.completedTrainings}</p>
            <p className="text-xs text-muted-foreground">
              Ø {avgMonthlyTrainings}/měsíc
            </p>
          </div>

          {/* Products */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <ShoppingBag className="h-3.5 w-3.5" />
              <span className="text-xs">Produkty</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(stats.productIncome)}</p>
            <p className="text-xs text-muted-foreground">
              {stats.topProducts?.length || 0} různých produktů
            </p>
          </div>

          {/* Training Income */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Dumbbell className="h-3.5 w-3.5" />
              <span className="text-xs">Z tréninků</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(stats.trainingIncome)}</p>
            <p className="text-xs text-muted-foreground">
              Ø {formatCurrency(stats.avgTrainingPriceActual || 0)}/trénink
            </p>
          </div>

          {/* Active Days */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-xs">Aktivních dní</span>
            </div>
            <p className="text-lg font-bold">{stats.activeDays}</p>
            <p className="text-xs text-muted-foreground">
              z {stats.totalDays} dní celkem
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
