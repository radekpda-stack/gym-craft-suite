import { Trophy, TrendingUp, Activity, Zap, Timer, Gauge, Heart, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatInfoTooltip } from '@/components/statistics/StatInfoTooltip';
import { formatPaceKmDisplay } from '@/lib/timeUtils';

interface StrengthKPIs {
  maxWeight: number | null;
  maxWeightClient?: string;
  maxVolume: number | null;
  maxVolumeClient?: string;
  bestPerformance: number | null; // Estimated 1RM or max output
  trend30Days: 'up' | 'down' | 'stable';
  trend90Days: 'up' | 'down' | 'stable';
}

interface CardioKPIs {
  bestPace: number | null; // seconds per km
  bestPaceClient?: string;
  longestDistance: number | null;
  longestDistanceClient?: string;
  maxPower: number | null;
  avgPower: number | null;
  avgHeartRate: number | null;
}

interface ExerciseKPICardsProps {
  exerciseType: 'strength' | 'cardio' | 'mixed';
  strengthKPIs?: StrengthKPIs;
  cardioKPIs?: CardioKPIs;
  clientName?: string;
}

const TrendBadge = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
  if (trend === 'up') return <Badge variant="secondary" className="text-muted-foreground">↑ Růst</Badge>;
  if (trend === 'down') return <Badge variant="secondary" className="text-muted-foreground">↓ Pokles</Badge>;
  return <Badge variant="secondary" className="text-muted-foreground">— Stabil</Badge>;
};

const formatPace = formatPaceKmDisplay;

export function ExerciseKPICards({ exerciseType, strengthKPIs, cardioKPIs, clientName }: ExerciseKPICardsProps) {
  if (exerciseType === 'strength' || exerciseType === 'mixed') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Trophy className="w-4 h-4 text-primary" />
                <span>Max váha</span>
              </div>
              <StatInfoTooltip
                title="Maximální váha"
                description="Nejvyšší zaznamenaná váha"
                calculation="Maximum z weight_kg ze všech záznamů cviku"
              />
            </div>
            <p className="text-2xl font-bold mt-1">
              {strengthKPIs?.maxWeight ? `${strengthKPIs.maxWeight} kg` : '-'}
            </p>
            {strengthKPIs?.maxWeightClient && !clientName && (
              <p className="text-xs text-muted-foreground">{strengthKPIs.maxWeightClient}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Activity className="w-4 h-4" />
                <span>Nejvyšší objem</span>
              </div>
              <StatInfoTooltip
                title="Nejvyšší objem"
                description="Nejvyšší celkový objem v jednom tréninku"
                calculation="Maximum z (váha × opakování × série)"
              />
            </div>
            <p className="text-2xl font-bold mt-1">
              {strengthKPIs?.maxVolume ? `${Math.round(strengthKPIs.maxVolume / 1000)}t` : '-'}
            </p>
            {strengthKPIs?.maxVolumeClient && !clientName && (
              <p className="text-xs text-muted-foreground">{strengthKPIs.maxVolumeClient}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Zap className="w-4 h-4 text-primary" />
                <span>Est. 1RM</span>
              </div>
              <StatInfoTooltip
                title="Odhadovaný 1RM"
                description="Odhadovaný maximální výkon na 1 opakování"
                calculation="Brzycki vzorec: váha × (36 / (37 - reps))"
              />
            </div>
            <p className="text-2xl font-bold mt-1">
              {strengthKPIs?.bestPerformance ? `${strengthKPIs.bestPerformance} kg` : '-'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>Trend síly</span>
              </div>
              <StatInfoTooltip
                title="Trend síly"
                description="Vývoj výkonu za posledních 30/90 dní"
                calculation="Porovnání průměru posledních 5 vs předchozích 5 záznamů"
              />
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">30d:</span>
                <TrendBadge trend={strengthKPIs?.trend30Days || 'stable'} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">90d:</span>
                <TrendBadge trend={strengthKPIs?.trend90Days || 'stable'} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (exerciseType === 'cardio') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Timer className="w-4 h-4 text-primary" />
                <span>Nejrychlejší tempo</span>
              </div>
              <StatInfoTooltip
                title="Nejrychlejší tempo"
                description="Nejlepší průměrné tempo"
                calculation="Minimum z (čas / vzdálenost) převedeno na min/km"
              />
            </div>
            <p className="text-2xl font-bold mt-1">
              {formatPace(cardioKPIs?.bestPace || null)}
            </p>
            {cardioKPIs?.bestPaceClient && !clientName && (
              <p className="text-xs text-muted-foreground">{cardioKPIs.bestPaceClient}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Target className="w-4 h-4" />
                <span>Nejdelší vzdálenost</span>
              </div>
              <StatInfoTooltip
                title="Nejdelší vzdálenost"
                description="Maximální vzdálenost v jednom tréninku"
                calculation="Maximum z distance_meters"
              />
            </div>
            <p className="text-2xl font-bold mt-1">
              {cardioKPIs?.longestDistance ? `${(cardioKPIs.longestDistance / 1000).toFixed(1)} km` : '-'}
            </p>
            {cardioKPIs?.longestDistanceClient && !clientName && (
              <p className="text-xs text-muted-foreground">{cardioKPIs.longestDistanceClient}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Gauge className="w-4 h-4 text-primary" />
                <span>Výkon (W)</span>
              </div>
              <StatInfoTooltip
                title="Výkon"
                description="Maximální a průměrný výkon"
                calculation="Max a průměr z avg_watts"
              />
            </div>
            <p className="text-2xl font-bold mt-1">
              {cardioKPIs?.maxPower ? `${cardioKPIs.maxPower}` : '-'}
            </p>
            {cardioKPIs?.avgPower && (
              <p className="text-xs text-muted-foreground">Ø {cardioKPIs.avgPower} W</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Heart className="w-4 h-4 text-muted-foreground" />
                <span>Průměrná TF</span>
              </div>
              <StatInfoTooltip
                title="Průměrná tepová frekvence"
                description="Průměrná tepová frekvence při tomto cviku"
                calculation="Průměr z avg_heart_rate"
              />
            </div>
            <p className="text-2xl font-bold mt-1">
              {cardioKPIs?.avgHeartRate ? `${cardioKPIs.avgHeartRate} bpm` : '-'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
