/**
 * PRHistoryTimeline - Chronological timeline of personal records
 * Design: Vertical timeline with fire indicators for significant gains
 */
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Trophy, Flame, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { RecentPR } from '@/hooks/useClientProgressStats';

interface PRHistoryTimelineProps {
  prs: RecentPR[];
  isLoading?: boolean;
  maxItems?: number;
  onPRClick?: (pr: RecentPR) => void;
}

function formatPRValue(value: number, unit: string): string {
  if (unit === 's') {
    return formatDuration(value);
  }
  if (unit === 'm' && value >= 1000) {
    return `${(value / 1000).toFixed(2)} km`;
  }
  return `${value} ${unit}`;
}

export function PRHistoryTimeline({
  prs,
  isLoading,
  maxItems = 10,
  onPRClick,
}: PRHistoryTimelineProps) {
  if (isLoading) {
    return (
      <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const displayedPRs = prs.slice(0, maxItems);

  return (
    <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-warning/15 shadow-lg shadow-warning/25">
          <Trophy className="w-5 h-5 text-warning" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Historie rekordů</h3>
          <p className="text-[10px] text-muted-foreground">
            Posledních 90 dní · {prs.length} PR
          </p>
        </div>
      </div>

      {/* Timeline */}
      {displayedPRs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Zatím žádné osobní rekordy</p>
        </div>
      ) : (
        <div className="relative space-y-1">
          {/* Vertical line */}
          <div className="absolute left-4 top-4 bottom-4 w-px bg-border/50" />

          {displayedPRs.map((pr, index) => {
            const formattedDate = format(parseISO(pr.date), 'd. MMM', { locale: cs });
            const isRecent = index === 0;

            return (
              <button
                key={pr.id}
                onClick={() => onPRClick?.(pr)}
                className={cn(
                  'relative w-full flex items-center gap-4 p-3 pl-10 rounded-xl text-left',
                  'hover:bg-muted/50 transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-primary/30'
                )}
              >
                {/* Timeline dot */}
                <div className={cn(
                  'absolute left-2 w-4 h-4 rounded-full border-2 bg-background',
                  isRecent 
                    ? 'border-warning shadow-sm shadow-warning/30' 
                    : 'border-primary/50'
                )}>
                  {isRecent && (
                    <div className="absolute inset-0.5 rounded-full bg-warning animate-pulse" />
                  )}
                </div>

                {/* Date */}
                <div className="w-16 flex-shrink-0">
                  <p className={cn(
                    'text-sm font-medium',
                    isRecent ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {formattedDate}
                  </p>
                </div>

                {/* Exercise name */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {pr.exerciseName}
                  </p>
                </div>

                {/* Value */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-bold tabular-nums text-primary">
                    {formatPRValue(pr.value, pr.unit)}
                  </span>
                  {pr.changePercent && pr.changePercent >= 5 && (
                    <div className="flex items-center gap-0.5 text-orange-500">
                      <Flame className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium tabular-nums">
                        +{Math.round(pr.changePercent)}%
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Show more indicator */}
      {prs.length > maxItems && (
        <p className="text-center text-xs text-muted-foreground pt-2">
          +{prs.length - maxItems} dalších rekordů
        </p>
      )}
    </div>
  );
}
