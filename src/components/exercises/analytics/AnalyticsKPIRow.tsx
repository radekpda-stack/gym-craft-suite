import { TrendingUp, TrendingDown, Minus, Weight, Calendar, Trophy, Activity, Dumbbell } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { StatInfoTooltip } from '@/components/statistics/StatInfoTooltip';
import { Skeleton } from '@/components/ui/skeleton';
import type { AnalyticsKPI } from '@/hooks/useExerciseAnalyticsComplete';

interface AnalyticsKPIRowProps {
  kpi: AnalyticsKPI | undefined;
  isLoading?: boolean;
}

function formatVolume(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return `${Math.round(value)}`;
}

function TrendBadge({ value, suffix = '%', inverted = false }: { value: number | undefined; suffix?: string; inverted?: boolean }) {
  if (value === undefined || value === 0) return null;
  
  const isPositive = inverted ? value < 0 : value > 0;
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-[10px] font-medium px-1 py-0.5 rounded",
      isPositive && "text-green-600 bg-green-500/10",
      !isPositive && value !== 0 && "text-red-500 bg-red-500/10"
    )}>
      <Icon className="w-2.5 h-2.5" />
      {Math.abs(value)}{suffix}
    </span>
  );
}

const HELP_CONTENT = {
  tonnage: {
    title: 'Tonnage (objem)',
    description: 'Celkový objem zátěže za období. Nezahrnuje bodyweight cviky.',
    calculation: 'Tonnage = Σ (série × opakování × váha kg)',
  },
  prCount: {
    title: 'Osobní rekordy',
    description: 'Počet dosažených PR za období. PR = nové maximum ve váze, čase nebo vzdálenosti.',
    calculation: 'Počet záznamů s is_pr = true',
  },
  frequency: {
    title: 'Frekvence',
    description: 'Průměrný počet tréninkových dnů za týden v daném období.',
    calculation: 'Frekvence = počet unikátních dnů s tréninkem ÷ počet týdnů',
  },
  avgRpe: {
    title: 'Průměrné RPE',
    description: 'Průměrná hodnota vnímané námahy (Rate of Perceived Exertion) za období.',
    calculation: 'Průměr všech RPE hodnot (1-10)',
  },
  bwReps: {
    title: 'BW opakování',
    description: 'Celkový počet opakování u bodyweight cviků (shyby, kliky, dropy atd.).',
    calculation: 'BW reps = Σ (série × opakování) pro is_bodyweight = true',
  },
};

export function AnalyticsKPIRow({ kpi, isLoading }: AnalyticsKPIRowProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="p-3">
            <Skeleton className="h-3 w-12 mb-2" />
            <Skeleton className="h-6 w-16" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
      {/* Tonnage */}
      <Card className="p-3">
        <div className="flex items-center gap-1 text-muted-foreground mb-1">
          <Weight className="w-3 h-3 shrink-0" />
          <span className="text-[10px] uppercase tracking-wide">Tonnage</span>
          <StatInfoTooltip
            title={HELP_CONTENT.tonnage.title}
            description={HELP_CONTENT.tonnage.description}
            calculation={HELP_CONTENT.tonnage.calculation}
          />
        </div>
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-lg font-bold tabular-nums">{formatVolume(kpi?.tonnage || 0)}</span>
          <span className="text-[10px] text-muted-foreground">kg</span>
          <TrendBadge value={kpi?.tonnageTrend} />
        </div>
      </Card>

      {/* PR Count */}
      <Card className="p-3">
        <div className="flex items-center gap-1 text-muted-foreground mb-1">
          <Trophy className="w-3 h-3 shrink-0 text-amber-500" />
          <span className="text-[10px] uppercase tracking-wide">PR</span>
          <StatInfoTooltip
            title={HELP_CONTENT.prCount.title}
            description={HELP_CONTENT.prCount.description}
            calculation={HELP_CONTENT.prCount.calculation}
          />
        </div>
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-lg font-bold tabular-nums">{kpi?.prCount || 0}</span>
          <TrendBadge value={kpi?.prTrend} />
        </div>
      </Card>

      {/* Frequency */}
      <Card className="p-3">
        <div className="flex items-center gap-1 text-muted-foreground mb-1">
          <Calendar className="w-3 h-3 shrink-0" />
          <span className="text-[10px] uppercase tracking-wide">Frekvence</span>
          <StatInfoTooltip
            title={HELP_CONTENT.frequency.title}
            description={HELP_CONTENT.frequency.description}
            calculation={HELP_CONTENT.frequency.calculation}
          />
        </div>
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-lg font-bold tabular-nums">{kpi?.frequency?.toFixed(1) || '0'}</span>
          <span className="text-[10px] text-muted-foreground">×/týden</span>
          <TrendBadge value={kpi?.frequencyTrend} />
        </div>
      </Card>

      {/* Avg RPE */}
      <Card className="p-3">
        <div className="flex items-center gap-1 text-muted-foreground mb-1">
          <Activity className="w-3 h-3 shrink-0" />
          <span className="text-[10px] uppercase tracking-wide">Ø RPE</span>
          <StatInfoTooltip
            title={HELP_CONTENT.avgRpe.title}
            description={HELP_CONTENT.avgRpe.description}
            calculation={HELP_CONTENT.avgRpe.calculation}
          />
        </div>
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-lg font-bold tabular-nums">{kpi?.avgRpe?.toFixed(1) || '-'}</span>
          <TrendBadge value={kpi?.rpeTrend} suffix="" inverted />
        </div>
      </Card>

      {/* BW Reps (secondary) */}
      <Card className="p-3 bg-muted/30 col-span-2 sm:col-span-1">
        <div className="flex items-center gap-1 text-muted-foreground mb-1">
          <Dumbbell className="w-3 h-3 shrink-0" />
          <span className="text-[10px] uppercase tracking-wide">BW reps</span>
          <StatInfoTooltip
            title={HELP_CONTENT.bwReps.title}
            description={HELP_CONTENT.bwReps.description}
            calculation={HELP_CONTENT.bwReps.calculation}
          />
        </div>
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-lg font-bold tabular-nums">{formatVolume(kpi?.bwReps || 0)}</span>
          <TrendBadge value={kpi?.bwRepsTrend} />
        </div>
      </Card>
    </div>
  );
}
