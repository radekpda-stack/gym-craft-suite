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
      "text-muted-foreground bg-muted/50"
    )}>
      <TrendingUp className={cn("w-2.5 h-2.5", !isPositive && "rotate-180")} />
      {isPositive ? '+' : ''}{value}%
    </span>
  );
}

function MiniProgressRing({ value, maxValue, color }: { value: number; maxValue: number; color: string }) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
      {/* Background circle */}
      <circle
        cx="22"
        cy="22"
        r="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        className="text-muted/30"
      />
      {/* Progress circle */}
      <circle
        cx="22"
        cy="22"
        r="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        className={color}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
      />
    </svg>
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
      borderColor: 'border-primary/30',
      shadowColor: 'shadow-primary/20',
      ringColor: 'text-primary',
      trend: exercisesTrend,
      maxValue: 300, // Reference max for progress ring
    },
    {
      icon: Activity,
      value: totalEntriesThisMonth,
      label: 'záznamů tento měsíc',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      shadowColor: 'shadow-emerald-500/20',
      ringColor: 'text-emerald-500',
      trend: entriesTrend,
      maxValue: 200,
    },
    {
      icon: Trophy,
      value: totalPRsThisMonth,
      label: 'PR tento měsíc',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/30',
      shadowColor: 'shadow-warning/20',
      ringColor: 'text-warning',
      trend: prsTrend,
      maxValue: 50,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card-floating rounded-xl p-2.5 sm:p-4">
            <div className="flex flex-col items-center sm:flex-row gap-1.5 sm:gap-3">
              <Skeleton className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl" />
              <div className="space-y-1.5 w-full">
                <Skeleton className="w-10 sm:w-16 h-5 sm:h-7 mx-auto sm:mx-0" />
                <Skeleton className="w-16 sm:w-24 h-2 sm:h-3 mx-auto sm:mx-0" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className={cn(
            "relative overflow-hidden rounded-xl p-2.5 sm:p-4",
            "bg-card/80 backdrop-blur-md",
            "border shadow-sm",
            kpi.borderColor,
          )}
        >
          <div className={cn("absolute inset-0 opacity-30 bg-gradient-to-br to-transparent", kpi.bgColor)} />
          
          <div className="relative flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-1.5 sm:gap-3">
            <div className={cn(
              'p-2 sm:p-3 rounded-lg sm:rounded-xl shadow-sm',
              kpi.bgColor,
            )}>
              <kpi.icon className={cn('w-4 h-4 sm:w-5 sm:h-5', kpi.color)} />
            </div>
            
            <div className="min-w-0">
              <p className="text-lg sm:text-3xl font-bold text-foreground tabular-nums leading-tight">
                {kpi.value.toLocaleString('cs-CZ')}
              </p>
              <p className="text-[8px] sm:text-xs text-muted-foreground leading-tight uppercase tracking-wider mt-0.5">
                {kpi.label}
              </p>
            </div>
          </div>
          
          <div className="relative mt-2 pt-1.5 sm:pt-2 border-t border-border/30">
            <div className="h-1 rounded-full bg-muted/30 overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all duration-700 ease-out", kpi.bgColor.replace('/10', '/60'))}
                style={{ width: `${Math.min((kpi.value / kpi.maxValue) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
