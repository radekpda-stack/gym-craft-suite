import { TrendingUp, TrendingDown, Minus, Weight, Calendar, Trophy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { StatInfoTooltip } from '@/components/statistics/StatInfoTooltip';
import type { ExerciseAnalyticsNewData } from '@/hooks/useExerciseAnalyticsNew';

interface AnalyticsKPICardsProps {
  data: ExerciseAnalyticsNewData | undefined;
  isLoading?: boolean;
}

function formatVolume(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${Math.round(value)}`;
}

function TrendBadge({ value, suffix = '%' }: { value: number | undefined; suffix?: string }) {
  if (value === undefined) return null;
  
  const isPositive = value > 0;
  const isNeutral = value === 0;
  const Icon = isPositive ? TrendingUp : isNeutral ? Minus : TrendingDown;
  
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded",
      isPositive && "text-success bg-success/10",
      isNeutral && "text-muted-foreground bg-muted",
      !isPositive && !isNeutral && "text-destructive bg-destructive/10"
    )}>
      <Icon className="w-3 h-3" />
      {Math.abs(value)}{suffix}
    </span>
  );
}

// Help content for KPI cards
const HELP_CONTENT = {
  totalVolume: {
    title: 'Celkový objem',
    description: 'Součet veškeré zátěže za zvolené období. Trend porovnává druhou polovinu období s první.',
    calculation: 'Objem = Σ (série × opakování × váha v kg)',
  },
  avgPerWeek: {
    title: 'Průměr za týden',
    description: 'Průměrný tréninkový objem na jeden týden za zvolené období.',
    calculation: 'Průměr = Celkový objem ÷ počet týdnů v období',
  },
  topPattern: {
    title: 'Top vzorec',
    description: 'Nejčastěji zastoupený pohybový vzorec v tréninku za zvolené období.',
    calculation: 'Počítá se frekvence výskytu každého pohybového vzorce (squat, hinge, push, pull...) a zobrazí se ten s nejvyšším počtem.',
  },
};

export function AnalyticsKPICards({ data, isLoading }: AnalyticsKPICardsProps) {
  // Calculate KPIs
  const totalVolume = data?.totalVolume || 0;
  const weekCount = data?.volumeTimeline?.length || 1;
  const avgPerWeek = weekCount > 0 ? totalVolume / weekCount : 0;
  
  // Top movement pattern
  const topPattern = data?.movementPatterns?.[0];
  
  // Trend calculation (compare last half to first half)
  const timeline = data?.volumeTimeline || [];
  const midPoint = Math.floor(timeline.length / 2);
  const firstHalf = timeline.slice(0, midPoint);
  const secondHalf = timeline.slice(midPoint);
  
  const firstHalfVolume = firstHalf.reduce((sum, d) => sum + d.volume, 0);
  const secondHalfVolume = secondHalf.reduce((sum, d) => sum + d.volume, 0);
  const trendPercent = firstHalfVolume > 0 
    ? Math.round(((secondHalfVolume - firstHalfVolume) / firstHalfVolume) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-16 mb-2" />
            <div className="h-6 bg-muted rounded w-20" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Total Volume */}
      <Card className="p-3 sm:p-4 bg-card/80 backdrop-blur-md border-border/50 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="flex items-center gap-1 text-muted-foreground mb-1">
          <div className="p-1 rounded-md bg-primary/10">
            <Weight className="w-3.5 h-3.5 text-primary shrink-0" />
          </div>
          <span className="text-xs truncate ml-1">Celkový objem</span>
          <StatInfoTooltip
            title={HELP_CONTENT.totalVolume.title}
            description={HELP_CONTENT.totalVolume.description}
            calculation={HELP_CONTENT.totalVolume.calculation}
          />
        </div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-lg sm:text-xl font-bold tabular-nums">{formatVolume(totalVolume)}</span>
          <span className="text-xs text-muted-foreground">kg</span>
        </div>
        <TrendBadge value={trendPercent} />
      </Card>

      {/* Avg per Week */}
      <Card className="p-3 sm:p-4 bg-card/80 backdrop-blur-md border-border/50 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="flex items-center gap-1 text-muted-foreground mb-1">
          <div className="p-1 rounded-md bg-success/10">
            <Calendar className="w-3.5 h-3.5 text-success shrink-0" />
          </div>
          <span className="text-xs truncate ml-1">Průměr/týden</span>
          <StatInfoTooltip
            title={HELP_CONTENT.avgPerWeek.title}
            description={HELP_CONTENT.avgPerWeek.description}
            calculation={HELP_CONTENT.avgPerWeek.calculation}
          />
        </div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-lg sm:text-xl font-bold tabular-nums">{formatVolume(avgPerWeek)}</span>
          <span className="text-xs text-muted-foreground">kg</span>
        </div>
      </Card>

      {/* Top Pattern */}
      <Card className="p-3 sm:p-4 bg-card/80 backdrop-blur-md border-border/50 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="flex items-center gap-1 text-muted-foreground mb-1">
          <div className="p-1 rounded-md bg-warning/10">
            <Trophy className="w-3.5 h-3.5 text-warning shrink-0" />
          </div>
          <span className="text-xs truncate ml-1">Top vzorec</span>
          <StatInfoTooltip
            title={HELP_CONTENT.topPattern.title}
            description={HELP_CONTENT.topPattern.description}
            calculation={HELP_CONTENT.topPattern.calculation}
          />
        </div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm sm:text-base font-bold truncate">
            {topPattern?.label || '-'}
          </span>
        </div>
        {topPattern && (
          <span className="text-xs text-muted-foreground tabular-nums">{topPattern.count}×</span>
        )}
      </Card>
    </div>
  );
}
