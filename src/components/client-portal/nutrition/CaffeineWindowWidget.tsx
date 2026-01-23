/**
 * CaffeineWindowWidget - displays caffeine intake timing relative to sleep
 */

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Coffee, AlertTriangle, CheckCircle, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateCaffeineCutoff, isCaffeineAfterCutoff } from '@/hooks/useClientHabitSettings';

interface CaffeineEntry {
  id: string;
  entry_time: string; // HH:mm format
  coffee_type: string;
  is_caffeinated: boolean;
  count?: number;
}

interface CaffeineWindowWidgetProps {
  /** Caffeine entries for the day */
  entries: CaffeineEntry[];
  /** Sleep time in HH:mm format */
  sleepTime: string | null;
  /** Cutoff minutes before sleep */
  cutoffMinutes: number;
  /** Optional className */
  className?: string;
  /** Show detailed timeline */
  showTimeline?: boolean;
}

export function CaffeineWindowWidget({
  entries,
  sleepTime,
  cutoffMinutes,
  className,
  showTimeline = true,
}: CaffeineWindowWidgetProps) {
  const analysis = useMemo(() => {
    if (!sleepTime) {
      return {
        cutoffTime: null,
        lateEntries: [],
        hasLateCaffeine: false,
        latestCaffeineTime: null,
        caffeineCount: 0,
      };
    }

    const cutoffTime = calculateCaffeineCutoff(sleepTime, cutoffMinutes);
    
    const caffeineatedEntries = entries.filter(e => e.is_caffeinated);
    const lateEntries = caffeineatedEntries.filter(e => 
      isCaffeineAfterCutoff(e.entry_time, sleepTime, cutoffMinutes)
    );

    // Find latest caffeine time
    let latestTime: string | null = null;
    caffeineatedEntries.forEach(e => {
      if (!latestTime || e.entry_time > latestTime) {
        latestTime = e.entry_time;
      }
    });

    return {
      cutoffTime,
      lateEntries,
      hasLateCaffeine: lateEntries.length > 0,
      latestCaffeineTime: latestTime,
      caffeineCount: caffeineatedEntries.length,
    };
  }, [entries, sleepTime, cutoffMinutes]);

  // If no sleep time configured, show setup prompt
  if (!sleepTime) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted text-muted-foreground">
            <Moon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-sm">Kofeinové okno</h4>
            <p className="text-xs text-muted-foreground">
              Nastav čas spánku v nastavení
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const StatusIcon = analysis.hasLateCaffeine ? AlertTriangle : CheckCircle;
  const statusColor = analysis.hasLateCaffeine ? 'text-amber-500' : 'text-green-500';
  const statusBg = analysis.hasLateCaffeine ? 'bg-amber-500/20' : 'bg-green-500/20';

  return (
    <Card className={cn('p-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('p-2 rounded-lg', statusBg, statusColor)}>
          <Coffee className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-sm">Kofeinové okno</h4>
          <p className="text-xs text-muted-foreground">
            Cutoff: {analysis.cutoffTime} • Spánek: {sleepTime}
          </p>
        </div>
        <StatusIcon className={cn('h-5 w-5', statusColor)} />
      </div>

      {/* Timeline visualization */}
      {showTimeline && (
        <div className="mb-3">
          <CaffeineTimeline
            entries={entries}
            cutoffTime={analysis.cutoffTime!}
            sleepTime={sleepTime}
          />
        </div>
      )}

      {/* Status message */}
      <div className={cn(
        'text-xs p-2 rounded-lg',
        analysis.hasLateCaffeine ? 'bg-amber-500/10 text-amber-700' : 'bg-green-500/10 text-green-700'
      )}>
        {analysis.hasLateCaffeine ? (
          <>
            ⚠️ {analysis.lateEntries.length}× kofein po {analysis.cutoffTime} - může zasahovat do spánku
          </>
        ) : analysis.caffeineCount > 0 ? (
          <>✓ Kofein v pořádku ({analysis.caffeineCount}× před cutoff)</>
        ) : (
          <>☕ Dnes bez kofeinu</>
        )}
      </div>
    </Card>
  );
}

/**
 * Visual timeline of caffeine intake
 */
function CaffeineTimeline({
  entries,
  cutoffTime,
  sleepTime,
}: {
  entries: CaffeineEntry[];
  cutoffTime: string;
  sleepTime: string;
}) {
  // Convert time to position (6:00 = 0%, 24:00 = 100%)
  const timeToPercent = (time: string): number => {
    const [hours, mins] = time.split(':').map(Number);
    const totalMins = hours * 60 + mins;
    // Display range: 6:00 (360 mins) to 24:00 (1440 mins)
    const startMins = 360; // 6:00
    const endMins = 1440; // 24:00
    const range = endMins - startMins;
    return Math.max(0, Math.min(100, ((totalMins - startMins) / range) * 100));
  };

  const cutoffPercent = timeToPercent(cutoffTime);

  return (
    <div className="relative h-8 bg-muted rounded-lg overflow-hidden">
      {/* Green zone (before cutoff) */}
      <div 
        className="absolute top-0 left-0 h-full bg-green-500/20"
        style={{ width: `${cutoffPercent}%` }}
      />
      
      {/* Red zone (after cutoff) */}
      <div 
        className="absolute top-0 h-full bg-red-500/20"
        style={{ left: `${cutoffPercent}%`, right: 0 }}
      />

      {/* Cutoff line */}
      <div 
        className="absolute top-0 w-0.5 h-full bg-amber-500"
        style={{ left: `${cutoffPercent}%` }}
      />

      {/* Entry markers */}
      {entries.map((entry) => {
        const percent = timeToPercent(entry.entry_time);
        const isLate = percent >= cutoffPercent;
        
        return (
          <div
            key={entry.id}
            className={cn(
              'absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center text-[8px]',
              entry.is_caffeinated
                ? isLate 
                  ? 'bg-red-500 text-white' 
                  : 'bg-green-500 text-white'
                : 'bg-gray-400 text-white'
            )}
            style={{ left: `calc(${percent}% - 8px)` }}
            title={`${entry.entry_time} - ${entry.coffee_type}${!entry.is_caffeinated ? ' (bez kofeinu)' : ''}`}
          >
            ☕
          </div>
        );
      })}

      {/* Time labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1 text-[8px] text-muted-foreground">
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>24:00</span>
      </div>
    </div>
  );
}

/**
 * Analyze caffeine entries for statistics
 */
export function analyzeCaffeineForPeriod(
  entriesByDay: Record<string, CaffeineEntry[]>,
  sleepTime: string | null,
  cutoffMinutes: number
): {
  daysWithLateCaffeine: number;
  totalDays: number;
  latestCaffeineTime: string | null;
  latestCaffeineType: string | null;
} {
  if (!sleepTime) {
    return {
      daysWithLateCaffeine: 0,
      totalDays: Object.keys(entriesByDay).length,
      latestCaffeineTime: null,
      latestCaffeineType: null,
    };
  }

  let daysWithLateCaffeine = 0;
  let latestTime: string | null = null;
  let latestType: string | null = null;

  Object.values(entriesByDay).forEach(dayEntries => {
    const caffeineated = dayEntries.filter(e => e.is_caffeinated);
    const hasLate = caffeineated.some(e => 
      isCaffeineAfterCutoff(e.entry_time, sleepTime, cutoffMinutes)
    );
    
    if (hasLate) daysWithLateCaffeine++;

    caffeineated.forEach(e => {
      if (!latestTime || e.entry_time > latestTime) {
        latestTime = e.entry_time;
        latestType = e.coffee_type;
      }
    });
  });

  return {
    daysWithLateCaffeine,
    totalDays: Object.keys(entriesByDay).length,
    latestCaffeineTime: latestTime,
    latestCaffeineType: latestType,
  };
}
