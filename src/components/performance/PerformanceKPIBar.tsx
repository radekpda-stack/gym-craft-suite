import { Dumbbell, Activity, Trophy, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface PerformanceKPIBarProps {
  totalExercises: number;
  totalEntriesThisMonth: number;
  totalPRsThisMonth: number;
  isLoading?: boolean;
  exercisesTrend?: number;
  entriesTrend?: number;
  prsTrend?: number;
}

function TrendPill({ value }: { value?: number }) {
  if (!value || value === 0) return null;
  const isPositive = value > 0;
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full",
      isPositive
        ? "bg-success/15 text-success"
        : "bg-destructive/15 text-destructive"
    )}>
      {isPositive
        ? <TrendingUp className="w-2.5 h-2.5" />
        : <TrendingDown className="w-2.5 h-2.5" />
      }
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
      label: 'cviků',
      sublabel: 'v knihovně',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/25',
      trend: exercisesTrend,
      maxValue: 300,
      tooltip: 'Celkový počet cviků v knihovně — silové, kardio i pliometrické.',
    },
    {
      icon: Activity,
      value: totalEntriesThisMonth,
      label: 'záz.',
      sublabel: 'tento měsíc',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/25',
      trend: entriesTrend,
      maxValue: 200,
      tooltip: 'Počet zapsaných výkonů za aktuální kalendářní měsíc.',
    },
    {
      icon: Trophy,
      value: totalPRsThisMonth,
      label: 'PR',
      sublabel: 'tento měsíc',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/25',
      trend: prsTrend,
      maxValue: 50,
      tooltip: 'Počet osobních rekordů klientů zaznamenaných tento měsíc.',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl p-3 border bg-card/80">
            <Skeleton className="w-8 h-8 rounded-lg mb-2" />
            <Skeleton className="w-10 h-6 mb-1" />
            <Skeleton className="w-14 h-3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={cn(
              "relative overflow-hidden rounded-xl p-3 sm:p-4",
              "bg-card/80 backdrop-blur-md border shadow-sm",
              kpi.borderColor,
            )}
          >
            {/* Gradient overlay */}
            <div className={cn("absolute inset-0 opacity-25 bg-gradient-to-br to-transparent", kpi.bgColor)} />

            <div className="relative flex flex-col gap-2">
              {/* Icon row */}
              <div className="flex items-center justify-between">
                <div className={cn("w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shadow-sm", kpi.bgColor)}>
                  <kpi.icon className={cn("w-4 h-4 sm:w-4.5 sm:h-4.5", kpi.color)} />
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                      <Info className="w-3 h-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[180px] text-xs">
                    {kpi.tooltip}
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Value */}
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums leading-none">
                  {kpi.value.toLocaleString('cs-CZ')}
                </p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                  {kpi.sublabel}
                </p>
              </div>

              {/* Progress bar + trend */}
              <div className="space-y-1">
                <div className="h-1 rounded-full bg-muted/30 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700 ease-out", kpi.bgColor.replace('/10', '/60'))}
                    style={{ width: `${Math.min((kpi.value / kpi.maxValue) * 100, 100)}%` }}
                  />
                </div>
                {kpi.trend !== undefined && (
                  <div className="flex items-center gap-1">
                    <TrendPill value={kpi.trend} />
                    {kpi.trend !== 0 && (
                      <span className="text-[9px] text-muted-foreground">vs. min. měsíc</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
