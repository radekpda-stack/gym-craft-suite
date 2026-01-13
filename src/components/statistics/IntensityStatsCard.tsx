import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Battery, TrendingUp, TrendingDown } from 'lucide-react';
import { useTrainingIntensityStats } from '@/hooks/useTrainingIntensityStats';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function IntensityStatsCard() {
  const { data, isLoading } = useTrainingIntensityStats();

  if (isLoading) {
    return <Skeleton className="h-48 rounded-xl" />;
  }

  if (!data || data.totalWithIntensity === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Flame className="h-4 w-4 text-muted-foreground" />
            Intenzita tréninků
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Zatím žádná RPE/RIR data
          </p>
        </CardContent>
      </Card>
    );
  }

  const getIntensityLevel = (rpe: number) => {
    if (rpe >= 8) return { label: 'Vysoká', color: 'text-destructive', bg: 'bg-destructive/10' };
    if (rpe >= 6) return { label: 'Střední', color: 'text-warning', bg: 'bg-warning/10' };
    return { label: 'Nízká', color: 'text-success', bg: 'bg-success/10' };
  };

  const intensity = getIntensityLevel(data.avgRPE);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Flame className="h-4 w-4 text-warning" />
          Intenzita tréninků
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main metrics in a compact row */}
        <div className="grid grid-cols-2 gap-3">
          <div className={cn('p-3 rounded-lg text-center', intensity.bg)}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame className="h-4 w-4 text-warning" />
              <span className={cn('text-2xl font-bold', intensity.color)}>
                {data.avgRPE.toFixed(1)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Ø RPE</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/50 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Battery className="h-4 w-4 text-success" />
              <span className="text-2xl font-bold">{data.avgRIR.toFixed(1)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Ø RIR</p>
          </div>
        </div>

        {/* Intensity breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-destructive" />
              <span className="text-muted-foreground">Vysoká (8+)</span>
            </div>
            <span className="font-medium">{data.highIntensityCount} tréninků</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-3.5 w-3.5 text-success" />
              <span className="text-muted-foreground">Nízká (≤5)</span>
            </div>
            <span className="font-medium">{data.lowIntensityCount} tréninků</span>
          </div>
        </div>

        {/* Total count */}
        <p className="text-xs text-center text-muted-foreground pt-2 border-t">
          Z {data.totalWithIntensity} tréninků s RPE/RIR
        </p>
      </CardContent>
    </Card>
  );
}
