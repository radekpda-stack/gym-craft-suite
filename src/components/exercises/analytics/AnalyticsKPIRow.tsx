import { TrendingUp, TrendingDown, Minus, Weight, Calendar, Trophy, Activity, Dumbbell } from 'lucide-react';
import { Users } from 'lucide-react';
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
      "inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
      isPositive && "text-emerald-600 bg-emerald-500/10",
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
  clientsAttention: {
    title: 'Klienti vyžadující pozornost',
    description: 'Počet klientů, kteří vykazují signály vyžadující zásah trenéra.',
    calculation: 'Kritéria: žádné PR za období, klesající frekvence tréninků',
  },
};

const KPI_CONFIGS = [
  { key: 'tonnage', icon: Weight, iconColor: 'text-primary', bgColor: 'bg-primary/10', borderColor: 'border-primary/20' },
  { key: 'prCount', icon: Trophy, iconColor: 'text-warning', bgColor: 'bg-warning/10', borderColor: 'border-warning/20' },
  { key: 'frequency', icon: Calendar, iconColor: 'text-accent', bgColor: 'bg-accent/10', borderColor: 'border-accent/20' },
  { key: 'avgRpe', icon: Activity, iconColor: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
  { key: 'bwReps', icon: Dumbbell, iconColor: 'text-muted-foreground', bgColor: 'bg-muted/30', borderColor: 'border-border' },
];

export function AnalyticsKPIRow({ kpi, isLoading }: AnalyticsKPIRowProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="p-3 bg-card/80 backdrop-blur-md border-border/50">
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
      <Card className={cn(
        "relative overflow-hidden p-3",
        "bg-card/80 backdrop-blur-md",
        "border shadow-sm",
        KPI_CONFIGS[0].borderColor
      )}>
        <div className={cn("absolute inset-0 opacity-30 bg-gradient-to-br to-transparent", KPI_CONFIGS[0].bgColor)} />
        <div className="relative">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
            <div className={cn("p-1 rounded", KPI_CONFIGS[0].bgColor)}>
              <Weight className={cn("w-3 h-3", KPI_CONFIGS[0].iconColor)} />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-medium">Tonnage</span>
            <StatInfoTooltip
              title={HELP_CONTENT.tonnage.title}
              description={HELP_CONTENT.tonnage.description}
              calculation={HELP_CONTENT.tonnage.calculation}
            />
          </div>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl font-bold tabular-nums">{formatVolume(kpi?.tonnage || 0)}</span>
            <span className="text-[10px] text-muted-foreground">kg</span>
            <TrendBadge value={kpi?.tonnageTrend} />
          </div>
          {kpi?.eVolume != null && kpi.eVolume > 0 && (
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-[10px] text-muted-foreground">eVol:</span>
              <span className="text-xs font-medium tabular-nums text-muted-foreground">{formatVolume(kpi.eVolume)}</span>
              <TrendBadge value={kpi?.eVolumeTrend} />
            </div>
          )}
        </div>
      </Card>

      {/* PR Count */}
      <Card className={cn(
        "relative overflow-hidden p-3",
        "bg-card/80 backdrop-blur-md",
        "border shadow-sm",
        KPI_CONFIGS[1].borderColor
      )}>
        <div className={cn("absolute inset-0 opacity-30 bg-gradient-to-br to-transparent", KPI_CONFIGS[1].bgColor)} />
        <div className="relative">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
            <div className={cn("p-1 rounded", KPI_CONFIGS[1].bgColor)}>
              <Trophy className={cn("w-3 h-3", KPI_CONFIGS[1].iconColor)} />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-medium">PR</span>
            <StatInfoTooltip
              title={HELP_CONTENT.prCount.title}
              description={HELP_CONTENT.prCount.description}
              calculation={HELP_CONTENT.prCount.calculation}
            />
          </div>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl font-bold tabular-nums">{kpi?.prCount || 0}</span>
            <TrendBadge value={kpi?.prTrend} />
          </div>
        </div>
      </Card>

      {/* Frequency */}
      <Card className={cn(
        "relative overflow-hidden p-3",
        "bg-card/80 backdrop-blur-md",
        "border shadow-sm",
        KPI_CONFIGS[2].borderColor
      )}>
        <div className={cn("absolute inset-0 opacity-30 bg-gradient-to-br to-transparent", KPI_CONFIGS[2].bgColor)} />
        <div className="relative">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
            <div className={cn("p-1 rounded", KPI_CONFIGS[2].bgColor)}>
              <Calendar className={cn("w-3 h-3", KPI_CONFIGS[2].iconColor)} />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-medium">Frekvence</span>
            <StatInfoTooltip
              title={HELP_CONTENT.frequency.title}
              description={HELP_CONTENT.frequency.description}
              calculation={HELP_CONTENT.frequency.calculation}
            />
          </div>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl font-bold tabular-nums">{kpi?.frequency?.toFixed(1) || '0'}</span>
            <span className="text-[10px] text-muted-foreground">×/týden</span>
            <TrendBadge value={kpi?.frequencyTrend} />
          </div>
        </div>
      </Card>

      {/* Avg RPE */}
      <Card className={cn(
        "relative overflow-hidden p-3",
        "bg-card/80 backdrop-blur-md",
        "border shadow-sm",
        KPI_CONFIGS[3].borderColor
      )}>
        <div className={cn("absolute inset-0 opacity-30 bg-gradient-to-br to-transparent", KPI_CONFIGS[3].bgColor)} />
        <div className="relative">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
            <div className={cn("p-1 rounded", KPI_CONFIGS[3].bgColor)}>
              <Activity className={cn("w-3 h-3", KPI_CONFIGS[3].iconColor)} />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-medium">Ø RPE</span>
            <StatInfoTooltip
              title={HELP_CONTENT.avgRpe.title}
              description={HELP_CONTENT.avgRpe.description}
              calculation={HELP_CONTENT.avgRpe.calculation}
            />
          </div>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl font-bold tabular-nums">{kpi?.avgRpe?.toFixed(1) || '-'}</span>
            <TrendBadge value={kpi?.rpeTrend} suffix="" inverted />
          </div>
        </div>
      </Card>

      {/* Clients Needing Attention */}
      <Card className={cn(
        "relative overflow-hidden p-3 col-span-2 sm:col-span-1",
        "bg-card/80 backdrop-blur-md",
        "border shadow-sm",
        kpi?.clientsNeedingAttentionCount && kpi.clientsNeedingAttentionCount > 0 
          ? "border-warning/30" 
          : "border-border/50"
      )}>
        <div className={cn(
          "absolute inset-0 opacity-30 bg-gradient-to-br to-transparent",
          kpi?.clientsNeedingAttentionCount && kpi.clientsNeedingAttentionCount > 0 
            ? "bg-warning/10" 
            : "bg-muted/30"
        )} />
        <div className="relative">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
            <div className={cn(
              "p-1 rounded",
              kpi?.clientsNeedingAttentionCount && kpi.clientsNeedingAttentionCount > 0 
                ? "bg-warning/10" 
                : "bg-muted/50"
            )}>
              <Users className={cn(
                "w-3 h-3",
                kpi?.clientsNeedingAttentionCount && kpi.clientsNeedingAttentionCount > 0 
                  ? "text-warning" 
                  : "text-muted-foreground"
              )} />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-medium">Pozornost</span>
            <StatInfoTooltip
              title={HELP_CONTENT.clientsAttention.title}
              description={HELP_CONTENT.clientsAttention.description}
              calculation={HELP_CONTENT.clientsAttention.calculation}
            />
          </div>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className={cn(
              "text-xl font-bold tabular-nums",
              kpi?.clientsNeedingAttentionCount && kpi.clientsNeedingAttentionCount > 0 && "text-warning"
            )}>
              {kpi?.clientsNeedingAttentionCount || 0}
            </span>
            <span className="text-[10px] text-muted-foreground">klientů</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
