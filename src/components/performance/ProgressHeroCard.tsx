/**
 * ProgressHeroCard - Hero stats card showing client's key progress metrics
 * Design: Glassmorphism with instrumental gauges
 */
import { Trophy, Calendar, TrendingUp, Activity, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface ProgressHeroCardProps {
  totalPRs: number;
  prsThisMonth: number;
  trainingsCount: number;
  activeMonths: number;
  volumeTrend: number;
  isLoading?: boolean;
}

export function ProgressHeroCard({
  totalPRs,
  prsThisMonth,
  trainingsCount,
  activeMonths,
  volumeTrend,
  isLoading,
}: ProgressHeroCardProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: 'Celkem PR',
      value: totalPRs,
      icon: Trophy,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      glowColor: 'shadow-warning/20',
    },
    {
      label: 'PR tento měsíc',
      value: prsThisMonth,
      icon: Flame,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      glowColor: 'shadow-orange-500/20',
      highlight: prsThisMonth > 0,
    },
    {
      label: 'Tréninků (90d)',
      value: trainingsCount,
      icon: Activity,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      glowColor: 'shadow-primary/20',
    },
    {
      label: 'Měsíců aktivní',
      value: activeMonths,
      icon: Calendar,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      glowColor: 'shadow-blue-500/20',
    },
  ];

  return (
    <div className="space-y-3">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={cn(
                'relative overflow-hidden rounded-xl p-4',
                'bg-card/80 backdrop-blur-md border border-border/50',
                'shadow-sm hover:shadow-lg transition-all duration-200',
                stat.highlight && 'ring-1 ring-orange-500/30'
              )}
            >
              {/* Background glow */}
              {stat.highlight && (
                <div className="absolute -top-8 -right-8 w-16 h-16 bg-orange-500/20 rounded-full blur-xl" />
              )}
              
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    {stat.label}
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold tabular-nums">
                    {stat.value}
                  </p>
                </div>
                <div className={cn(
                  'p-2 rounded-lg',
                  stat.bgColor,
                  'shadow-sm',
                  stat.glowColor
                )}>
                  <Icon className={cn('w-4 h-4', stat.color)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Volume Trend Bar */}
      {volumeTrend !== 0 && (
        <div className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-xl',
          'bg-card/60 backdrop-blur-sm border border-border/30 border-l-2 border-l-primary/50'
        )}>
          <TrendingUp className={cn(
            'w-4 h-4 text-muted-foreground',
            volumeTrend < 0 && 'rotate-180'
          )} />
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">
              Trend aktivity oproti předchozím 90 dnům
            </p>
          </div>
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {volumeTrend > 0 ? '+' : ''}{volumeTrend}%
          </span>
        </div>
      )}
    </div>
  );
}
