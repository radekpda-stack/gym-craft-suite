import { AnalyticsCard } from './AnalyticsCard';
import { Heart } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CardioClientStats } from '@/hooks/useClientCardioComparison';

interface Props {
  data: CardioClientStats[];
  isLoading: boolean;
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDistance(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

export function CardioClientComparisonCard({ data, isLoading }: Props) {
  return (
    <AnalyticsCard
      title="Kardio: srovnání klientů"
      icon={Heart}
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage="Žádná kardio data"
      helpContent={{
        title: 'Kardio srovnání klientů',
        description: 'Celkový čas, vzdálenost, Ø watts a Ø HR za zvolené období pro každého klienta.',
      }}
    >
      <ScrollArea className="h-[240px]">
        <div className="space-y-2">
          {data.slice(0, 15).map((c) => (
            <div key={c.clientId} className="flex items-center gap-3 p-2 rounded-lg bg-background/60 border border-border/30">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.clientName}</p>
                <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                  <span>{c.entryCount} zázn.</span>
                  <span>{formatDuration(c.totalDurationSec)}</span>
                  {c.totalDistanceM > 0 && <span>{formatDistance(c.totalDistanceM)}</span>}
                </div>
              </div>
              <div className="flex gap-3 text-xs shrink-0">
                {c.avgWatts > 0 && (
                  <div className="text-center">
                    <p className="font-medium">{c.avgWatts}</p>
                    <p className="text-[9px] text-muted-foreground">W</p>
                  </div>
                )}
                {c.avgHeartRate > 0 && (
                  <div className="text-center">
                    <p className="font-medium">{c.avgHeartRate}</p>
                    <p className="text-[9px] text-muted-foreground">HR</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </AnalyticsCard>
  );
}
