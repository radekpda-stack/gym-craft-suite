import { Dumbbell, Activity, Trophy, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PerformanceKPIBarProps {
  totalExercises: number;
  totalEntriesThisMonth: number;
  totalPRsThisMonth: number;
  isLoading?: boolean;
  // Optional trends
  exercisesTrend?: number;
  entriesTrend?: number;
  prsTrend?: number;
}

function TrendIndicator({ value }: { value?: number }) {
  if (!value || value === 0) return null;
  
  const isPositive = value > 0;
  
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
      isPositive ? "text-emerald-600 bg-emerald-500/10" : "text-red-500 bg-red-500/10"
    )}>
      <TrendingUp className={cn("w-2.5 h-2.5", !isPositive && "rotate-180")} />
      {isPositive ? '+' : ''}{value}%
    </span>
  );
}

export function PerformanceKPIBar({
  totalExercises,
  totalEntriesThisMonth,
  totalPRsThisMonth,
  isLoading,
  exercisesTrend,
  entriesTrend,
  prsTrend,
}: PerformanceKPIBarProps) {
  const kpis = [
    {
      icon: Dumbbell,
      value: totalExercises,
      label: 'cviků v knihovně',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
      trend: exercisesTrend,
    },
    {
      icon: Activity,
      value: totalEntriesThisMonth,
      label: 'záznamů tento měsíc',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      trend: entriesTrend,
    },
    {
      icon: Trophy,
      value: totalPRsThisMonth,
      label: 'PR tento měsíc',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/20',
      trend: prsTrend,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card-floating rounded-xl p-3 flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="w-12 h-6" />
              <Skeleton className="w-20 h-3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className={cn(
            "relative overflow-hidden rounded-xl p-3 sm:p-4",
            "bg-card/80 backdrop-blur-md",
            "border shadow-sm",
            kpi.borderColor,
            "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
          )}
        >
          {/* Subtle background gradient */}
          <div className={cn("absolute inset-0 opacity-30 bg-gradient-to-br to-transparent", kpi.bgColor)} />
          
          <div className="relative flex items-center gap-3">
            <div className={cn('p-2.5 rounded-xl shadow-sm', kpi.bgColor)}>
              <kpi.icon className={cn('w-5 h-5', kpi.color)} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
                  {kpi.value.toLocaleString('cs-CZ')}
                </p>
                <TrendIndicator value={kpi.trend} />
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight uppercase tracking-wide">
                {kpi.label}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
