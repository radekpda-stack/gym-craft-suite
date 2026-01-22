import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCardioStatsNew } from '@/hooks/useCardioStatsNew';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Clock, Heart, Flame, Route, Timer } from 'lucide-react';
import { formatDuration, formatPaceFromDistance } from '@/lib/timeUtils';

const formatTime = formatDuration;

interface CardioDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CardioDetailModal({ open, onOpenChange }: CardioDetailModalProps) {
  const { data, isLoading } = useCardioStatsNew(6); // 6 months for detail

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Kardio statistiky</DialogTitle>
          </DialogHeader>
          <Skeleton className="h-64 w-full" />
        </DialogContent>
      </Dialog>
    );
  }

  const avgPace = data?.totalDistance && data?.totalTime 
    ? formatPaceFromDistance(data.totalTime, data.totalDistance) 
    : '—';

  const avgDuration = data?.sessionCount && data?.totalTime
    ? formatTime(data.totalTime / data.sessionCount)
    : '—';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-accent" />
            Kardio statistiky - detail
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Main metrics grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-accent/10 rounded-lg p-4">
              <div className="flex items-center gap-2 text-accent mb-2">
                <Route className="h-4 w-4" />
                <span className="text-sm font-medium">Celková vzdálenost</span>
              </div>
              <p className="text-3xl font-bold">{(data?.totalDistance || 0).toFixed(1)} km</p>
              <p className="text-xs text-muted-foreground mt-1">za posledních 6 měsíců</p>
            </div>

            <div className="bg-primary/10 rounded-lg p-4">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Celkový čas</span>
              </div>
              <p className="text-3xl font-bold">{formatTime(data?.totalTime || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">aktivního kardia</p>
            </div>

            <div className="bg-destructive/10 rounded-lg p-4">
              <div className="flex items-center gap-2 text-destructive mb-2">
                <Heart className="h-4 w-4" />
                <span className="text-sm font-medium">Ø Tepová frekvence</span>
              </div>
              <p className="text-3xl font-bold">{data?.avgHeartRate || '—'} <span className="text-lg font-normal">bpm</span></p>
            </div>

            <div className="bg-warning/10 rounded-lg p-4">
              <div className="flex items-center gap-2 text-warning mb-2">
                <Flame className="h-4 w-4" />
                <span className="text-sm font-medium">Spálené kalorie</span>
              </div>
              <p className="text-3xl font-bold">{data?.totalCalories || '—'} <span className="text-lg font-normal">kcal</span></p>
            </div>
          </div>

          {/* Additional metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Ø Tempo</p>
              <p className="text-lg font-semibold">{avgPace}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Ø Délka tréninku</p>
              <p className="text-lg font-semibold">{avgDuration}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Počet tréninků</p>
              <p className="text-lg font-semibold">{data?.sessionCount || 0}</p>
            </div>
          </div>

          {/* Info box */}
          <div className="bg-muted/30 rounded-lg p-4 text-sm">
            <h4 className="font-medium mb-2">Co se zde počítá?</h4>
            <ul className="text-muted-foreground space-y-1">
              <li>• <strong>Vzdálenost:</strong> Součet všech naběhaných/ujetých kilometrů</li>
              <li>• <strong>Čas:</strong> Celkový čas strávený kardio aktivitami</li>
              <li>• <strong>Tepová frekvence:</strong> Průměr ze všech záznamů s TF</li>
              <li>• <strong>Kalorie:</strong> Součet zaznamenaných kalorií (pokud jsou zadány)</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
