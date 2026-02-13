import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

interface HeatmapData {
  dow: number;
  hour: number;
  count: number;
}

interface SalesHeatmapProps {
  data: HeatmapData[];
}

const DAY_LABELS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6:00 - 20:00

export function SalesHeatmap({ data }: SalesHeatmapProps) {
  const { grid, maxCount } = useMemo(() => {
    const grid = new Map<string, number>();
    let maxCount = 0;
    data.forEach(d => {
      const key = `${d.dow}-${d.hour}`;
      grid.set(key, (grid.get(key) || 0) + d.count);
      maxCount = Math.max(maxCount, grid.get(key)!);
    });
    return { grid, maxCount };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        Nedostatek dat pro heatmapu
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-medium">Prodejní hodiny</h3>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[500px]">
          {/* Hour headers */}
          <div className="grid gap-0.5" style={{ gridTemplateColumns: `40px repeat(${HOURS.length}, 1fr)` }}>
            <div />
            {HOURS.map(h => (
              <div key={h} className="text-[10px] text-muted-foreground text-center">{h}:00</div>
            ))}
          </div>
          {/* Rows */}
          {DAY_LABELS.map((day, di) => (
            <div key={day} className="grid gap-0.5 mt-0.5" style={{ gridTemplateColumns: `40px repeat(${HOURS.length}, 1fr)` }}>
              <div className="text-[11px] font-medium text-muted-foreground flex items-center">{day}</div>
              {HOURS.map(h => {
                const count = grid.get(`${di}-${h}`) || 0;
                const intensity = maxCount > 0 ? count / maxCount : 0;
                return (
                  <div
                    key={h}
                    title={`${day} ${h}:00 — ${count} prodejů`}
                    className={cn(
                      "aspect-square rounded-sm transition-colors min-h-[18px]",
                      intensity === 0 && "bg-muted/30",
                      intensity > 0 && intensity <= 0.25 && "bg-primary/20",
                      intensity > 0.25 && intensity <= 0.5 && "bg-primary/40",
                      intensity > 0.5 && intensity <= 0.75 && "bg-primary/60",
                      intensity > 0.75 && "bg-primary/90",
                    )}
                  />
                );
              })}
            </div>
          ))}
          {/* Legend */}
          <div className="flex items-center justify-end gap-1.5 mt-3">
            <span className="text-[10px] text-muted-foreground">Méně</span>
            {[0, 0.25, 0.5, 0.75, 1].map((i) => (
              <div
                key={i}
                className={cn(
                  "w-3 h-3 rounded-sm",
                  i === 0 && "bg-muted/30",
                  i === 0.25 && "bg-primary/20",
                  i === 0.5 && "bg-primary/40",
                  i === 0.75 && "bg-primary/60",
                  i === 1 && "bg-primary/90",
                )}
              />
            ))}
            <span className="text-[10px] text-muted-foreground">Více</span>
          </div>
        </div>
      </div>
    </div>
  );
}
