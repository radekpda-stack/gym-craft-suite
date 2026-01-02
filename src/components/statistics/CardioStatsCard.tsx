import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCardioStatsNew } from '@/hooks/useCardioStatsNew';
import { Activity, Clock, Heart, Flame } from 'lucide-react';

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function CardioStatsCard() {
  const { data, isLoading } = useCardioStatsNew(3);

  if (isLoading) {
    return (
      <Card className="p-4 sm:p-5">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </Card>
    );
  }

  const hasData = data && data.sessionCount > 0;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-blue-500/10">
          <Activity className="h-5 w-5 text-blue-500" />
        </div>
        <div>
          <h3 className="font-semibold">Kardio statistiky</h3>
          <p className="text-xs text-muted-foreground">Poslední 3 měsíce</p>
        </div>
      </div>

      {!hasData ? (
        <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
          Žádná kardio data k dispozici
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {/* Distance */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Activity className="h-4 w-4" />
              <span className="text-xs">Vzdálenost</span>
            </div>
            <div className="text-xl font-bold">
              {data.totalDistance.toFixed(1)} km
            </div>
          </div>

          {/* Time */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Celkový čas</span>
            </div>
            <div className="text-xl font-bold">
              {formatTime(data.totalTime)}
            </div>
          </div>

          {/* Heart Rate */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Heart className="h-4 w-4" />
              <span className="text-xs">Ø Tepová fr.</span>
            </div>
            <div className="text-xl font-bold">
              {data.avgHeartRate ? `${data.avgHeartRate} bpm` : '—'}
            </div>
          </div>

          {/* Calories */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Flame className="h-4 w-4" />
              <span className="text-xs">Kalorie</span>
            </div>
            <div className="text-xl font-bold">
              {data.totalCalories > 0 ? `${data.totalCalories} kcal` : '—'}
            </div>
          </div>
        </div>
      )}

      {hasData && (
        <div className="mt-3 pt-3 border-t border-border text-sm text-muted-foreground">
          Celkem {data.sessionCount} kardio záznamů
        </div>
      )}
    </Card>
  );
}
