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
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card-floating rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="space-y-2 flex-1">
                <Skeleton className="w-16 h-7" />
                <Skeleton className="w-24 h-3" />
              </div>
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
            "transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5",
            kpi.shadowColor.replace('shadow-', 'hover:shadow-')
          )}
        >
          {/* Subtle background gradient */}
          <div className={cn("absolute inset-0 opacity-30 bg-gradient-to-br to-transparent", kpi.bgColor)} />
          
          <div className="relative flex items-center gap-3">
            {/* Icon with enhanced glow */}
            <div className={cn(
              'relative p-3 rounded-xl shadow-lg',
              kpi.bgColor,
              kpi.shadowColor
            )}>
              <kpi.icon className={cn('w-5 h-5 sm:w-6 sm:h-6', kpi.color)} />
              {/* Mini progress ring overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <MiniProgressRing value={kpi.value} maxValue={kpi.maxValue} color={kpi.ringColor} />
              </div>
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <p className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
                  {kpi.value.toLocaleString('cs-CZ')}
                </p>
                <TrendIndicator value={kpi.trend} />
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight uppercase tracking-widest mt-0.5">
                {kpi.label}
              </p>
            </div>
          </div>
          
          {/* Bottom progress bar */}
          <div className="relative mt-3 pt-2 border-t border-border/30">
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
