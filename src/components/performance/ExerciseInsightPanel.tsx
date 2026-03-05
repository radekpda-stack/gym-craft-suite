/**
 * ExerciseInsightPanel - Reusable advanced metrics panel for any exercise
 * Shows: progression classification, best vs avg, frequency heatmap (12 weeks)
 */
import { useMemo } from 'react';
import { format, parseISO, subWeeks, startOfWeek, differenceInWeeks } from 'date-fns';
import { cs } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus, Zap, AlertTriangle, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ExerciseHistoryEntry } from '@/hooks/useExerciseHistory';
import { cn } from '@/lib/utils';

interface ExerciseInsightPanelProps {
  history: ExerciseHistoryEntry[];
  metricType: 'weight' | 'time' | 'reps' | 'distance';
}

type ProgressionClass = 'true_strength' | 'effort_increase' | 'fatigue_signal' | 'neutral';

function classifyProgression(history: ExerciseHistoryEntry[]): ProgressionClass {
  if (history.length < 4) return 'neutral';
  
  // Split into recent half and older half
  const mid = Math.floor(history.length / 2);
  const recent = history.slice(0, mid);
  const older = history.slice(mid);
  
  const avgRecent = (arr: ExerciseHistoryEntry[], key: 'weight_kg' | 'rpe') =>
    arr.reduce((s, e) => s + ((e as any)[key] || 0), 0) / arr.length;
  
  const recentWeight = avgRecent(recent, 'weight_kg');
  const olderWeight = avgRecent(older, 'weight_kg');
  const recentRpe = avgRecent(recent, 'rpe');
  const olderRpe = avgRecent(older, 'rpe');
  
  const weightUp = recentWeight > olderWeight * 1.02;
  const rpeUp = recentRpe > olderRpe + 0.5;
  const rpeStable = Math.abs(recentRpe - olderRpe) <= 0.5;
  
  if (weightUp && (rpeStable || recentRpe < olderRpe)) return 'true_strength';
  if (weightUp && rpeUp) return 'effort_increase';
  if (!weightUp && rpeUp) return 'fatigue_signal';
  return 'neutral';
}

const progressionLabels: Record<ProgressionClass, { label: string; icon: typeof TrendingUp; color: string }> = {
  true_strength: { label: 'Skutečná síla', icon: TrendingUp, color: 'text-success' },
  effort_increase: { label: 'Nárůst úsilí', icon: Zap, color: 'text-warning' },
  fatigue_signal: { label: 'Signál únavy', icon: AlertTriangle, color: 'text-destructive' },
  neutral: { label: 'Stabilní', icon: Minus, color: 'text-muted-foreground' },
};

export function ExerciseInsightPanel({ history, metricType }: ExerciseInsightPanelProps) {
  const classification = useMemo(() => classifyProgression(history), [history]);
  const classInfo = progressionLabels[classification];
  const ClassIcon = classInfo.icon;

  // Best vs average
  const { bestValue, avgValue, bestDisplay } = useMemo(() => {
    if (history.length === 0) return { bestValue: 0, avgValue: 0, bestDisplay: '–' };
    const getValue = (e: ExerciseHistoryEntry) => {
      switch (metricType) {
        case 'weight': return e.weight_kg || 0;
        case 'time': return e.time_seconds || 0;
        case 'reps': return e.reps || 0;
        case 'distance': return e.distance_meters || e.height_cm || 0;
      }
    };
    const values = history.map(getValue).filter(v => v > 0);
    if (values.length === 0) return { bestValue: 0, avgValue: 0, bestDisplay: '–' };
    const best = metricType === 'time' ? Math.min(...values) : Math.max(...values);
    const avg = Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
    const bestEntry = history.find(e => getValue(e) === best);
    return { bestValue: best, avgValue: avg, bestDisplay: bestEntry?.displayValue || `${best}` };
  }, [history, metricType]);

  // Frequency heatmap: 12 weeks
  const weeklyFrequency = useMemo(() => {
    const now = new Date();
    const weeks: { weekStart: Date; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const ws = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      weeks.push({ weekStart: ws, count: 0 });
    }
    history.forEach(entry => {
      const d = parseISO(entry.date);
      const weekIdx = 11 - differenceInWeeks(now, d);
      if (weekIdx >= 0 && weekIdx < 12) {
        weeks[weekIdx].count++;
      }
    });
    return weeks;
  }, [history]);

  const maxFreq = Math.max(...weeklyFrequency.map(w => w.count), 1);

  const getUnit = () => {
    switch (metricType) {
      case 'weight': return 'kg';
      case 'time': return 's';
      case 'reps': return 'reps';
      case 'distance': return 'm';
    }
  };

  return (
    <div className="space-y-4">
      {/* Progression classification */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border/30">
        <div className={cn("p-2 rounded-lg bg-background/80", classInfo.color)}>
          <ClassIcon className="w-5 h-5" />
        </div>
        <div>
          <p className={cn("font-semibold text-sm", classInfo.color)}>{classInfo.label}</p>
          <p className="text-xs text-muted-foreground">
            {classification === 'true_strength' && 'Výkon roste, RPE stabilní – čistý pokrok'}
            {classification === 'effort_increase' && 'Výkon roste, ale RPE taky – možná limit'}
            {classification === 'fatigue_signal' && 'RPE roste, výkon ne – zvažte deload'}
            {classification === 'neutral' && 'Nedostatek dat nebo stabilní výkon'}
          </p>
        </div>
      </div>

      {/* Best vs Average */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-secondary/50 text-center">
          <p className="text-xs text-muted-foreground mb-1">Nejlepší</p>
          <p className="text-lg font-bold text-primary">{bestDisplay}</p>
        </div>
        <div className="p-3 rounded-xl bg-secondary/50 text-center">
          <p className="text-xs text-muted-foreground mb-1">Průměr</p>
          <p className="text-lg font-bold">{avgValue} {getUnit()}</p>
        </div>
      </div>

      {/* Frequency heatmap */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground">Frekvence (12 týdnů)</p>
        </div>
        <div className="flex gap-1">
          {weeklyFrequency.map((week, i) => {
            const intensity = week.count / maxFreq;
            return (
              <div
                key={i}
                className="flex-1 aspect-square rounded-sm transition-colors"
                style={{
                  backgroundColor: week.count === 0
                    ? 'hsl(var(--muted))'
                    : `hsl(var(--primary) / ${0.15 + intensity * 0.85})`,
                }}
                title={`${format(week.weekStart, 'd.M', { locale: cs })}: ${week.count}×`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-muted-foreground">
            {format(weeklyFrequency[0]?.weekStart, 'd.M', { locale: cs })}
          </span>
          <span className="text-[9px] text-muted-foreground">dnes</span>
        </div>
      </div>
    </div>
  );
}
