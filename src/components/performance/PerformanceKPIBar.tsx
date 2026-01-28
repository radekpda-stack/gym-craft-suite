import { Dumbbell, Activity, Trophy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PerformanceKPIBarProps {
  totalExercises: number;
  totalEntriesThisMonth: number;
  totalPRsThisMonth: number;
  isLoading?: boolean;
}

export function PerformanceKPIBar({
  totalExercises,
  totalEntriesThisMonth,
  totalPRsThisMonth,
  isLoading,
}: PerformanceKPIBarProps) {
  const kpis = [
    {
      icon: Dumbbell,
      value: totalExercises,
      label: 'cviků v knihovně',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: Activity,
      value: totalEntriesThisMonth,
      label: 'záznamů tento měsíc',
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      icon: Trophy,
      value: totalPRsThisMonth,
      label: 'PR tento měsíc',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass rounded-xl p-3 flex items-center gap-3">
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
          className="glass rounded-xl p-3 flex items-center gap-3 transition-all hover:scale-[1.01]"
        >
          <div className={cn('p-2.5 rounded-lg', kpi.bgColor)}>
            <kpi.icon className={cn('w-5 h-5', kpi.color)} />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">
              {kpi.value.toLocaleString('cs-CZ')}
            </p>
            <p className="text-xs text-muted-foreground leading-tight">
              {kpi.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
