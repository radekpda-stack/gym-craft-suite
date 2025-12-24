import { TrendingUp, TrendingDown, Minus, Weight, Calendar, Trophy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
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
      isPositive && "text-green-500 bg-green-500/10",
      isNeutral && "text-muted-foreground bg-muted",
      !isPositive && !isNeutral && "text-red-500 bg-red-500/10"
    )}>
      <Icon className="w-3 h-3" />
      {Math.abs(value)}{suffix}
    </span>
  );
}

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
      <Card className="p-3 sm:p-4">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
          <Weight className="w-3.5 h-3.5" />
          <span className="text-xs">Celkový objem</span>
        </div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-lg sm:text-xl font-bold">{formatVolume(totalVolume)}</span>
          <span className="text-xs text-muted-foreground">kg</span>
        </div>
        <TrendBadge value={trendPercent} />
      </Card>

      {/* Avg per Week */}
      <Card className="p-3 sm:p-4">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
          <Calendar className="w-3.5 h-3.5" />
          <span className="text-xs">Průměr/týden</span>
        </div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-lg sm:text-xl font-bold">{formatVolume(avgPerWeek)}</span>
          <span className="text-xs text-muted-foreground">kg</span>
        </div>
      </Card>

      {/* Top Pattern */}
      <Card className="p-3 sm:p-4">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
          <Trophy className="w-3.5 h-3.5" />
          <span className="text-xs">Top vzorec</span>
        </div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm sm:text-base font-bold truncate">
            {topPattern?.label || '-'}
          </span>
        </div>
        {topPattern && (
          <span className="text-xs text-muted-foreground">{topPattern.count}×</span>
        )}
      </Card>
    </div>
  );
}
