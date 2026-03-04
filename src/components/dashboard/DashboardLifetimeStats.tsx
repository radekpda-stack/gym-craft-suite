import { useLifetimeStats, YoYComparison } from '@/hooks/useLifetimeStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { 
  Dumbbell, Clock, Banknote, ShoppingBag, Users, 
  TrendingUp, TrendingDown, Ban, Package, Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface PillStatProps {
  icon: ReactNode;
  label: string;
  value: string;
  yoy?: YoYComparison;
  className?: string;
}

function YoYBadge({ yoy }: { yoy: YoYComparison }) {
  if (yoy.thisYear === 0 && yoy.lastYear === 0) return null;
  
  const isUp = yoy.percentChange > 0;
  const isDown = yoy.percentChange < 0;
  const isFlat = yoy.percentChange === 0;
  
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-medium rounded-full px-1.5 py-0.5 leading-none',
      isUp && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
      isDown && 'bg-red-500/15 text-red-600 dark:text-red-400',
      isFlat && 'bg-muted text-muted-foreground',
    )}>
      {isUp && <TrendingUp className="w-2.5 h-2.5" />}
      {isDown && <TrendingDown className="w-2.5 h-2.5" />}
      {isFlat && <Minus className="w-2.5 h-2.5" />}
      {isFlat ? '0 %' : `${isUp ? '+' : ''}${yoy.percentChange} %`}
    </span>
  );
}

function PillStat({ icon, label, value, yoy, className }: PillStatProps) {
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
        <div className="flex items-center gap-1.5">
          <p className="text-sm sm:text-base font-bold text-foreground truncate">{value}</p>
          {yoy && <YoYBadge yoy={yoy} />}
        </div>
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
    { icon: <Dumbbell className={iconSize} />, label: 'Odtrénováno celkem', value: formatNumber(stats.totalTrainings), yoy: stats.yoyTrainings },
    { icon: <Clock className={iconSize} />, label: 'Celkem hodin', value: formatNumber(stats.totalHours) },
    { icon: <Banknote className={iconSize} />, label: 'Přijaté finance', value: formatCurrency(stats.totalIncomeReceived), yoy: stats.yoyIncome },
    { icon: <Package className={iconSize} />, label: 'Prodáno produktů', value: formatNumber(stats.totalProductsSold) },
    { icon: <ShoppingBag className={iconSize} />, label: 'Tržby z produktů', value: formatCurrency(stats.totalProductRevenue) },
    { icon: <Users className={iconSize} />, label: 'Klientů celkem', value: formatNumber(stats.totalClientsEver), yoy: stats.yoyClients },
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
