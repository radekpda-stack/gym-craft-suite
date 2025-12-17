import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, subMonths, startOfWeek, startOfMonth, format, eachWeekOfInterval, eachMonthOfInterval, differenceInWeeks } from 'date-fns';
import { cs } from 'date-fns/locale';

export type PRPeriod = '30days' | '3months' | '6months' | '12months' | 'custom';
export type PRType = '1rm' | 'maxWeight' | 'maxReps';

interface PREvent {
  id: string;
  exerciseId: string | null;
  exerciseName: string;
  value: number;
  reps: number;
  weight: number;
  estimated1RM: number;
  date: string;
  clientId: string;
  clientName: string;
  clientGender: string | null;
  prType: PRType;
}

interface PRCountPoint {
  label: string;
  date: string;
  prCount: number;
  maleCount: number;
  femaleCount: number;
}

interface PRBestPoint {
  label: string;
  date: string;
  value: number;
  exerciseName: string;
  prType: PRType;
}

interface ExerciseOption {
  id: string;
  name: string;
  prCount: number;
}

interface GenderStats {
  male: { count: number; avgValue: number; topPR: PREvent | null };
  female: { count: number; avgValue: number; topPR: PREvent | null };
}

interface ClientPRStats {
  clientId: string;
  clientName: string;
  gender: string | null;
  prCount: number;
  topPR: PREvent | null;
}

export interface PRMetricsData {
  prCountTimeline: PRCountPoint[];
  prBestTimeline: PRBestPoint[];
  prEvents: PREvent[];
  topPRsInPeriod: PREvent[];
  exerciseOptions: ExerciseOption[];
  totalPRCount: number;
  biggestPR: PREvent | null;
  genderStats: GenderStats;
  clientLeaderboard: ClientPRStats[];
  prVelocity: number; // PRs per week
}

// Epley formula for 1RM estimation
function estimate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps === 0 || weight === 0) return 0;
  return Math.round(weight * (1 + reps / 30));
}

function getDateRange(period: PRPeriod, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
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
    case 'custom':
      start = customStart || subMonths(now, 3);
      return { start, end: customEnd || now };
    default:
      start = subMonths(now, 3);
  }
  
  return { start, end: now };
}

function getTimeBuckets(start: Date, end: Date, period: PRPeriod): { date: Date; label: string }[] {
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff <= 30) {
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
    return weeks.map(w => ({
      date: w,
      label: format(w, 'd. MMM', { locale: cs })
    }));
  } else if (daysDiff <= 90) {
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
    return weeks.map(w => ({
      date: w,
      label: format(w, 'd. MMM', { locale: cs })
    }));
  } else {
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

export function usePRMetrics(
  period: PRPeriod,
  exerciseFilter: string | null = null,
  prType: PRType = '1rm',
  customStart?: Date,
  customEnd?: Date
) {
  return useQuery({
    queryKey: ['pr-metrics', period, exerciseFilter, prType, customStart?.toISOString(), customEnd?.toISOString()],
    queryFn: async (): Promise<PRMetricsData> => {
      const { start, end } = getDateRange(period, customStart, customEnd);
      const buckets = getTimeBuckets(start, end, period);
      const weekCount = Math.max(1, differenceInWeeks(end, start));

      let query = supabase
        .from('exercise_entries')
        .select('id, exercise_name, exercise_id, weight_kg, reps, sets, is_pr, date, client_id, clients(name, gender)')
        .gte('date', start.toISOString().split('T')[0])
        .lte('date', end.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (exerciseFilter) {
        query = query.eq('exercise_id', exerciseFilter);
      }

      const { data: entries } = await query;

      const bestByExercise = new Map<string, { maxWeight: number; max1RM: number; maxReps: Map<number, number> }>();
      const prEvents: PREvent[] = [];
      const exercisePRCounts = new Map<string, { id: string; name: string; count: number }>();
      const clientPRMap = new Map<string, ClientPRStats>();

      entries?.forEach((e: any) => {
        const exerciseKey = e.exercise_id || e.exercise_name;
        const exerciseName = e.exercise_name;
        const weight = e.weight_kg || 0;
        const reps = e.reps || 1;
        const estimated1RM = estimate1RM(weight, reps);
        const clientGender = e.clients?.gender || null;
        const clientId = e.client_id;
        const clientName = e.clients?.name || 'Neznámý';

        if (!bestByExercise.has(exerciseKey)) {
          bestByExercise.set(exerciseKey, { maxWeight: 0, max1RM: 0, maxReps: new Map() });
        }

        const best = bestByExercise.get(exerciseKey)!;
        let isPR = false;
        let detectedPRType: PRType = '1rm';
        let prValue = 0;

        if (estimated1RM > best.max1RM && estimated1RM > 0) {
          best.max1RM = estimated1RM;
          isPR = true;
          detectedPRType = '1rm';
          prValue = estimated1RM;
        }

        if (weight > best.maxWeight && weight > 0) {
          best.maxWeight = weight;
          if (!isPR || weight > prValue) {
            isPR = true;
            detectedPRType = 'maxWeight';
            prValue = weight;
          }
        }

        if (e.is_pr && !isPR && weight > 0) {
          isPR = true;
          detectedPRType = '1rm';
          prValue = estimated1RM;
        }

        if (isPR && prValue > 0) {
          const prEvent: PREvent = {
            id: e.id,
            exerciseId: e.exercise_id,
            exerciseName,
            value: prValue,
            reps,
            weight,
            estimated1RM,
            date: e.date,
            clientId,
            clientName,
            clientGender,
            prType: detectedPRType,
          };
          prEvents.push(prEvent);

          if (!exercisePRCounts.has(exerciseKey)) {
            exercisePRCounts.set(exerciseKey, { id: e.exercise_id || exerciseKey, name: exerciseName, count: 0 });
          }
          exercisePRCounts.get(exerciseKey)!.count += 1;

          // Track client PR stats
          if (!clientPRMap.has(clientId)) {
            clientPRMap.set(clientId, {
              clientId,
              clientName,
              gender: clientGender,
              prCount: 0,
              topPR: null,
            });
          }
          const clientStats = clientPRMap.get(clientId)!;
          clientStats.prCount += 1;
          if (!clientStats.topPR || estimated1RM > clientStats.topPR.estimated1RM) {
            clientStats.topPR = prEvent;
          }
        }
      });

      // Gender stats
      const malePRs = prEvents.filter(pr => pr.clientGender === 'male');
      const femalePRs = prEvents.filter(pr => pr.clientGender === 'female');
      
      const genderStats: GenderStats = {
        male: {
          count: malePRs.length,
          avgValue: malePRs.length > 0 
            ? Math.round(malePRs.reduce((sum, pr) => sum + pr.estimated1RM, 0) / malePRs.length)
            : 0,
          topPR: malePRs.sort((a, b) => b.estimated1RM - a.estimated1RM)[0] || null,
        },
        female: {
          count: femalePRs.length,
          avgValue: femalePRs.length > 0 
            ? Math.round(femalePRs.reduce((sum, pr) => sum + pr.estimated1RM, 0) / femalePRs.length)
            : 0,
          topPR: femalePRs.sort((a, b) => b.estimated1RM - a.estimated1RM)[0] || null,
        },
      };

      // Client leaderboard
      const clientLeaderboard = Array.from(clientPRMap.values())
        .sort((a, b) => b.prCount - a.prCount)
        .slice(0, 10);

      // PR count timeline with gender breakdown
      const prCountByBucket = new Map<string, { total: number; male: number; female: number }>();
      buckets.forEach(b => prCountByBucket.set(b.label, { total: 0, male: 0, female: 0 }));

      prEvents.forEach(pr => {
        const bucket = assignToBucket(new Date(pr.date), buckets);
        if (bucket) {
          const stats = prCountByBucket.get(bucket)!;
          stats.total += 1;
          if (pr.clientGender === 'male') stats.male += 1;
          else if (pr.clientGender === 'female') stats.female += 1;
        }
      });

      const prCountTimeline: PRCountPoint[] = buckets.map(b => {
        const stats = prCountByBucket.get(b.label)!;
        return {
          label: b.label,
          date: b.date.toISOString(),
          prCount: stats.total,
          maleCount: stats.male,
          femaleCount: stats.female,
        };
      });

      // PR best timeline
      const prBestByBucket = new Map<string, PREvent>();
      
      const filteredPRs = prType === '1rm' 
        ? prEvents.filter(pr => pr.prType === '1rm' || pr.prType === 'maxWeight')
        : prEvents.filter(pr => pr.prType === prType);

      filteredPRs.forEach(pr => {
        const bucket = assignToBucket(new Date(pr.date), buckets);
        if (bucket) {
          const existing = prBestByBucket.get(bucket);
          const value = prType === '1rm' ? pr.estimated1RM : pr.value;
          if (!existing || value > (prType === '1rm' ? existing.estimated1RM : existing.value)) {
            prBestByBucket.set(bucket, pr);
          }
        }
      });

      const prBestTimeline: PRBestPoint[] = buckets.map(b => {
        const pr = prBestByBucket.get(b.label);
        return {
          label: b.label,
          date: b.date.toISOString(),
          value: pr ? (prType === '1rm' ? pr.estimated1RM : pr.value) : 0,
          exerciseName: pr?.exerciseName || '',
          prType: pr?.prType || prType,
        };
      }).filter(p => p.value > 0);

      const topPRsInPeriod = [...prEvents]
        .sort((a, b) => {
          const aVal = prType === '1rm' ? a.estimated1RM : a.value;
          const bVal = prType === '1rm' ? b.estimated1RM : b.value;
          return bVal - aVal;
        })
        .slice(0, 10);

      const exerciseOptions: ExerciseOption[] = Array.from(exercisePRCounts.values())
        .sort((a, b) => b.count - a.count)
        .map(e => ({ id: e.id, name: e.name, prCount: e.count }));

      const biggestPR = topPRsInPeriod[0] || null;
      const prVelocity = Math.round((prEvents.length / weekCount) * 10) / 10;

      return {
        prCountTimeline,
        prBestTimeline,
        prEvents,
        topPRsInPeriod,
        exerciseOptions,
        totalPRCount: prEvents.length,
        biggestPR,
        genderStats,
        clientLeaderboard,
        prVelocity,
      };
    },
  });
}
