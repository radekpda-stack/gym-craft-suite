import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, subMonths, startOfWeek, format, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { cs } from 'date-fns/locale';

export type StrengthPeriod = '30days' | '3months' | '6months' | '12months';
export type StrengthMetric = '1rm' | 'volume' | 'frequency';

interface StrengthDataPoint {
  label: string;
  date: string;
  value: number;
}

interface ExerciseOption {
  id: string;
  name: string;
  frequency: number;
  last1RM: number;
}

export interface StrengthMetricsData {
  timeline: StrengthDataPoint[];
  current1RM: number | null;
  previous1RM: number | null;
  change1RM: number | null;
  exerciseOptions: ExerciseOption[];
  hasEnoughData: boolean;
  totalVolume: number;
  avgFrequency: number;
}

// Epley formula for 1RM estimation
function estimate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps === 0 || weight === 0) return 0;
  return Math.round(weight * (1 + reps / 30));
}

function getDateRange(period: StrengthPeriod): { start: Date; end: Date } {
  const now = new Date();
  let start: Date;
  
  switch (period) {
    case '30days':
      start = subDays(now, 30);
      break;
    case '3months':
      start = subMonths(now, 3);
      break;
    case '6months':
      start = subMonths(now, 6);
      break;
    case '12months':
      start = subMonths(now, 12);
      break;
    default:
      start = subMonths(now, 3);
  }
  
  return { start, end: now };
}

function getTimeBuckets(start: Date, end: Date, period: StrengthPeriod): { date: Date; label: string }[] {
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff <= 60) {
    // Weekly buckets
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
    return weeks.map(w => ({
      date: w,
      label: format(w, 'd. MMM', { locale: cs })
    }));
  } else {
    // Monthly buckets
    const months = eachMonthOfInterval({ start, end });
    return months.map(m => ({
      date: m,
      label: format(m, 'MMM yy', { locale: cs })
    }));
  }
}

function assignToBucket(date: Date, buckets: { date: Date; label: string }[]): string | null {
  for (let i = buckets.length - 1; i >= 0; i--) {
    if (date >= buckets[i].date) {
      return buckets[i].label;
    }
  }
  return buckets[0]?.label || null;
}

export function useStrengthMetrics(
  period: StrengthPeriod,
  metric: StrengthMetric,
  exerciseId: string | null // null = all exercises (for volume/frequency)
) {
  return useQuery({
    queryKey: ['strength-metrics', period, metric, exerciseId],
    queryFn: async (): Promise<StrengthMetricsData> => {
      const { start, end } = getDateRange(period);
      const buckets = getTimeBuckets(start, end, period);

      // Fetch exercise entries
      let query = supabase
        .from('exercise_entries')
        .select('id, exercise_name, exercise_id, weight_kg, reps, sets, date')
        .gte('date', start.toISOString().split('T')[0])
        .lte('date', end.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (exerciseId && metric === '1rm') {
        query = query.eq('exercise_id', exerciseId);
      }

      const { data: entries } = await query;

      // Track exercise options
      const exerciseStats = new Map<string, { id: string; name: string; frequency: number; max1RM: number }>();
      
      // Track data per bucket
      const bucketData = new Map<string, { max1RM: number; volume: number; trainingDays: Set<string> }>();
      buckets.forEach(b => bucketData.set(b.label, { max1RM: 0, volume: 0, trainingDays: new Set() }));

      let totalVolume = 0;
      const allTrainingDays = new Set<string>();

      entries?.forEach((e: any) => {
        const exerciseKey = e.exercise_id || e.exercise_name;
        const exerciseName = e.exercise_name;
        const weight = e.weight_kg || 0;
        const reps = e.reps || 1;
        const sets = e.sets || 1;
        const estimated1RM = estimate1RM(weight, reps);
        const volume = weight * reps * sets;

        // Track exercise stats
        if (!exerciseStats.has(exerciseKey)) {
          exerciseStats.set(exerciseKey, { id: e.exercise_id || exerciseKey, name: exerciseName, frequency: 0, max1RM: 0 });
        }
        const stats = exerciseStats.get(exerciseKey)!;
        stats.frequency += 1;
        if (estimated1RM > stats.max1RM) {
          stats.max1RM = estimated1RM;
        }

        // For specific exercise filtering
        if (exerciseId && metric === '1rm' && e.exercise_id !== exerciseId) {
          return;
        }

        // Assign to bucket
        const bucket = assignToBucket(new Date(e.date), buckets);
        if (bucket) {
          const data = bucketData.get(bucket)!;
          
          // 1RM: max in bucket
          if (estimated1RM > data.max1RM) {
            data.max1RM = estimated1RM;
          }
          
          // Volume: sum
          data.volume += volume;
          totalVolume += volume;
          
          // Frequency: unique training days
          data.trainingDays.add(e.date);
          allTrainingDays.add(e.date);
        }
      });

      // Build timeline based on metric
      let timeline: StrengthDataPoint[];
      
      switch (metric) {
        case '1rm':
          timeline = buckets.map(b => ({
            label: b.label,
            date: b.date.toISOString(),
            value: bucketData.get(b.label)?.max1RM || 0,
          }));
          // Fill gaps with last known value for smooth line
          let lastValue = 0;
          timeline = timeline.map(p => {
            if (p.value > 0) {
              lastValue = p.value;
              return p;
            }
            return { ...p, value: lastValue };
          });
          break;
          
        case 'volume':
          timeline = buckets.map(b => ({
            label: b.label,
            date: b.date.toISOString(),
            value: Math.round((bucketData.get(b.label)?.volume || 0) / 1000), // Convert to tons
          }));
          break;
          
        case 'frequency':
          timeline = buckets.map(b => ({
            label: b.label,
            date: b.date.toISOString(),
            value: bucketData.get(b.label)?.trainingDays.size || 0,
          }));
          break;
          
        default:
          timeline = [];
      }

      // Calculate 1RM change
      const timelineWithValues = timeline.filter(p => p.value > 0);
      const current1RM = timelineWithValues.length > 0 ? timelineWithValues[timelineWithValues.length - 1].value : null;
      const previous1RM = timelineWithValues.length > 1 ? timelineWithValues[timelineWithValues.length - 2].value : null;
      const change1RM = current1RM && previous1RM ? Math.round(((current1RM - previous1RM) / previous1RM) * 100) : null;

      // Exercise options sorted by frequency
      const exerciseOptions: ExerciseOption[] = Array.from(exerciseStats.values())
        .sort((a, b) => b.frequency - a.frequency)
        .map(e => ({ id: e.id, name: e.name, frequency: e.frequency, last1RM: e.max1RM }));

      // Average frequency (trainings per week)
      const weekCount = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7)));
      const avgFrequency = Math.round((allTrainingDays.size / weekCount) * 10) / 10;

      return {
        timeline,
        current1RM: metric === '1rm' ? current1RM : null,
        previous1RM: metric === '1rm' ? previous1RM : null,
        change1RM: metric === '1rm' ? change1RM : null,
        exerciseOptions,
        hasEnoughData: timelineWithValues.length >= 2,
        totalVolume: Math.round(totalVolume / 1000), // tons
        avgFrequency,
      };
    },
  });
}
