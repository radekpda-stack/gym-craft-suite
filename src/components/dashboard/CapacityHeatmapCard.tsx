import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Grid3X3, Clock, TrendingUp, Zap } from 'lucide-react';
import { useCapacityHeatmap } from '@/hooks/useCapacityHeatmap';
import { cn } from '@/lib/utils';

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun
const DAY_LABELS_SHORT = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

export function CapacityHeatmapCard() {
  const [weeksBack, setWeeksBack] = useState(4);
  const { data, isLoading } = useCapacityHeatmap(weeksBack);

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  // Group cells by hour for display
  const hours = Array.from(new Set(data.cells.map(c => c.hour))).sort((a, b) => a - b);
  
  // Create grid data structure
  const gridData: Map<string, number> = new Map();
  data.cells.forEach(cell => {
    gridData.set(`${cell.day}-${cell.hour}`, cell.count);
  });

  const getIntensityColor = (count: number) => {
    if (count === 0) return 'bg-secondary/30';
    const intensity = data.maxCount > 0 ? count / data.maxCount : 0;
    if (intensity > 0.75) return 'bg-primary';
    if (intensity > 0.5) return 'bg-primary/70';
    if (intensity > 0.25) return 'bg-primary/40';
    return 'bg-primary/20';
  };

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Grid3X3 className="h-4 w-4 text-primary" />
            Heatmapa vytížení
          </CardTitle>
          <div className="flex gap-1 p-0.5 rounded-full bg-secondary/50">
            {[2, 4, 8].map((w) => (
              <Button
                key={w}
                variant={weeksBack === w ? 'default' : 'ghost'}
                size="sm"
                className="rounded-full text-xs px-2 h-6"
                onClick={() => setWeeksBack(w)}
              >
                {w} týd
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-2">
          {data.peakTime && (
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="flex items-center gap-1.5 text-destructive">
                <Zap className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Špička</span>
              </div>
              <p className="text-sm font-semibold mt-1">
                {data.peakTime.day} {data.peakTime.hour}
              </p>
              <p className="text-xs text-muted-foreground">{data.peakTime.count} tréninků</p>
            </div>
          )}
          {data.quietTime && (
            <div className="p-2.5 rounded-lg bg-success/10 border border-success/20">
              <div className="flex items-center gap-1.5 text-success">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Volno</span>
              </div>
              <p className="text-sm font-semibold mt-1">
                {data.quietTime.day} {data.quietTime.hour}
              </p>
              <p className="text-xs text-muted-foreground">Nejméně obsazeno</p>
            </div>
          )}
        </div>

        {/* Heatmap grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[280px]">
            {/* Header row with day labels */}
            <div className="flex gap-0.5 mb-0.5">
              <div className="w-10 flex-shrink-0" /> {/* Empty corner */}
              {DAY_ORDER.map((dayIndex, i) => (
                <div
                  key={dayIndex}
                  className="flex-1 text-center text-[10px] text-muted-foreground font-medium py-1"
                >
                  {DAY_LABELS_SHORT[i]}
                </div>
              ))}
            </div>

            {/* Hour rows */}
            {hours.filter(h => h >= 7 && h <= 20).map(hour => (
              <div key={hour} className="flex gap-0.5 mb-0.5">
                <div className="w-10 flex-shrink-0 text-[10px] text-muted-foreground text-right pr-1 py-1">
                  {hour}:00
                </div>
                {DAY_ORDER.map((dayIndex) => {
                  const count = gridData.get(`${dayIndex}-${hour}`) || 0;
                  return (
                    <div
                      key={`${dayIndex}-${hour}`}
                      className={cn(
                        'flex-1 aspect-square rounded-sm transition-colors cursor-default',
                        getIntensityColor(count)
                      )}
                      title={`${DAY_LABELS_SHORT[DAY_ORDER.indexOf(dayIndex)]} ${hour}:00 - ${count} tréninků`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>Méně</span>
          <div className="flex gap-0.5">
            <div className="w-3 h-3 rounded-sm bg-secondary/30" />
            <div className="w-3 h-3 rounded-sm bg-primary/20" />
            <div className="w-3 h-3 rounded-sm bg-primary/40" />
            <div className="w-3 h-3 rounded-sm bg-primary/70" />
            <div className="w-3 h-3 rounded-sm bg-primary" />
          </div>
          <span>Více</span>
        </div>
      </CardContent>
    </Card>
  );
}
