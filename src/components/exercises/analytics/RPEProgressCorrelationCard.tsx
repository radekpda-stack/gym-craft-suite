import { AnalyticsCard } from './AnalyticsCard';
import { GitCompareArrows, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RpeProgressCorrelation } from '@/hooks/useExerciseAnalyticsComplete';

interface RPEProgressCorrelationCardProps {
  data: RpeProgressCorrelation[];
  isLoading?: boolean;
}

const HELP_CONTENT = {
  title: 'RPE vs. progrese',
  description: 'Korelace mezi změnou váhy a změnou RPE u jednotlivých cviků. Ukazuje zda je progres skutečný (více váhy, stejné RPE) nebo vynucený (více váhy, vyšší RPE).',
  calculation: 'Porovnání průměrné váhy a RPE mezi první a druhou polovinou období (min. 6 záznamů s RPE)',
};

const STATUS_CONFIG = {
  true_strength_gain: {
    label: 'Skutečný progres',
    description: 'Váha ↑ RPE stabilní',
    icon: TrendingUp,
    dotColor: 'bg-emerald-500',
    textColor: 'text-emerald-600',
  },
  effort_increase: {
    label: 'Vyšší úsilí',
    description: 'Váha ↑ RPE ↑',
    icon: Minus,
    dotColor: 'bg-warning',
    textColor: 'text-warning',
  },
  fatigue_signal: {
    label: 'Signál únavy',
    description: 'Váha stojí, RPE ↑',
    icon: TrendingDown,
    dotColor: 'bg-destructive',
    textColor: 'text-destructive',
  },
};

export function RPEProgressCorrelationCard({ data, isLoading }: RPEProgressCorrelationCardProps) {
  const isEmpty = !data || data.length === 0;

  return (
    <AnalyticsCard
      title="RPE vs. progrese"
      icon={GitCompareArrows}
      helpContent={HELP_CONTENT}
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyMessage="Nedostatek dat pro korelaci"
    >
      <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
        {data.slice(0, 10).map((item) => {
          const config = STATUS_CONFIG[item.status];
          const Icon = config.icon;

          return (
            <div
              key={item.exerciseName}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/30 transition-colors"
            >
              <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dotColor)} />
              <span className="text-[10px] truncate flex-1 text-foreground">{item.exerciseName}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[9px] tabular-nums text-muted-foreground">
                  {item.weightTrend > 0 ? '+' : ''}{item.weightTrend}% váha
                </span>
                <span className="text-[9px] tabular-nums text-muted-foreground">
                  {item.rpeTrend > 0 ? '+' : ''}{item.rpeTrend} RPE
                </span>
                <span className={cn("text-[8px] font-medium", config.textColor)}>
                  {config.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </AnalyticsCard>
  );
}
