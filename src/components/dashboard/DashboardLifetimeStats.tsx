import { useLifetimeStats } from '@/hooks/useLifetimeStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { 
  Dumbbell, Clock, Banknote, ShoppingBag, Users, 
  TrendingUp, Ban, Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface PillStatProps {
  icon: ReactNode;
  label: string;
  value: string;
  className?: string;
}

function PillStat({ icon, label, value, className }: PillStatProps) {
  return (
    <div className={cn(
      'flex items-center gap-2.5 rounded-xl border border-border/50 bg-card/80 px-3 py-2.5',
      'min-w-[150px] snap-start shrink-0',
      'sm:min-w-0 sm:shrink',
      className
    )}>
      <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm sm:text-base font-bold text-foreground truncate">{value}</p>
        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{label}</p>
      </div>
    </div>
  );
}

export function DashboardLifetimeStats() {
  const { data: stats, isLoading } = useLifetimeStats();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2 px-4 pt-4">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const iconSize = 'w-4 h-4';

  const pills = [
    { icon: <Dumbbell className={iconSize} />, label: 'Odtrénováno celkem', value: formatNumber(stats.totalTrainings) },
    { icon: <Clock className={iconSize} />, label: 'Celkem hodin', value: formatNumber(stats.totalHours) },
    { icon: <Banknote className={iconSize} />, label: 'Přijaté finance', value: formatCurrency(stats.totalIncomeReceived) },
    { icon: <Package className={iconSize} />, label: 'Prodáno produktů', value: formatNumber(stats.totalProductsSold) },
    { icon: <ShoppingBag className={iconSize} />, label: 'Tržby z produktů', value: formatCurrency(stats.totalProductRevenue) },
    { icon: <Users className={iconSize} />, label: 'Klientů celkem', value: formatNumber(stats.totalClientsEver) },
    { icon: <TrendingUp className={iconSize} />, label: 'Průměrná hodinovka', value: formatCurrency(stats.avgHourlyRate) },
    { icon: <Ban className={iconSize} />, label: 'Storno poplatky', value: formatCurrency(stats.cancellationFees) },
  ];

  return (
    <Card>
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">Celkový přehled</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {/* Mobile: horizontal scroll, Desktop: 4-col grid */}
        <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide sm:grid sm:grid-cols-4 sm:overflow-visible">
          {pills.map((pill) => (
            <PillStat key={pill.label} {...pill} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
