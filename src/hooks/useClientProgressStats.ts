import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { subDays, subMonths, format, parseISO, differenceInMonths } from 'date-fns';

export interface ExerciseProgress {
  exerciseId: string | null;
  exerciseName: string;
  type: 'strength' | 'cardio' | 'skill';
  firstValue: number;
  lastValue: number;
  firstDate: string;
  lastDate: string;
  changePercent: number;
  unit: string;
  sparklineData: { date: string; value: number }[];
  entryCount: number;
  prCount: number;
  isInverted: boolean; // true for time-based where lower is better
}

export interface RecentPR {
  id: string;
  date: string;
  exerciseName: string;
  exerciseId: string | null;
  value: number;
  previousValue: number | null;
  unit: string;
  changePercent: number | null;
}

export interface ClientProgressStats {
  clientId: string;
  clientName: string;
  totalPRs: number;
  prsThisMonth: number;
  prsLast90Days: number;
  trainingsCount90d: number;
  activeSince: string | null;
  activeMonths: number;
  volumeTrend: number; // procentuální změna objemu tréninků
  topExercises: ExerciseProgress[];
  recentPRs: RecentPR[];
  isLoading: boolean;
}

interface UseClientProgressStatsOptions {
  clientId: string | null;
  limit?: number;
}

export function useClientProgressStats({ clientId, limit = 6 }: UseClientProgressStatsOptions) {
  const { user } = useAuth();
  const now = new Date();
  const ninetyDaysAgo = format(subDays(now, 90), 'yyyy-MM-dd');
  const oneEightyDaysAgo = format(subDays(now, 180), 'yyyy-MM-dd');
  const thisMonthStart = format(subMonths(now, 0), 'yyyy-MM-01');

  return useQuery({
    queryKey: ['client-progress-stats', clientId, user?.id, limit],
    queryFn: async (): Promise<ClientProgressStats | null> => {
      if (!clientId || !user?.id) return null;

      // Fetch client info and all relevant data in parallel
      const [
        clientResult,
        allEntriesResult,
        prsThisMonthResult,
        prsLast90DaysResult,
        trainings90dResult,
        prevTrainings90dResult,
      ] = await Promise.all([
        // Client info
        supabase
          .from('clients')
          .select('id, name, created_at')
          .eq('id', clientId)
          .eq('user_id', user.id)
          .single(),

        // All exercise entries for this client (last 12 months for sparklines)
        supabase
          .from('exercise_entries')
          .select('id, exercise_id, exercise_name, weight_kg, reps, time_seconds, distance_meters, is_pr, date, exercises(exercise_type_v2, is_time_based)')
          .eq('client_id', clientId)
          .eq('user_id', user.id)
          .gte('date', format(subMonths(now, 12), 'yyyy-MM-dd'))
          .order('date', { ascending: true }),

        // PRs this month
        supabase
          .from('exercise_entries')
          .select('id')
          .eq('client_id', clientId)
          .eq('user_id', user.id)
          .eq('is_pr', true)
          .gte('date', thisMonthStart),

        // PRs last 90 days
        supabase
          .from('exercise_entries')
          .select('id, exercise_id, exercise_name, weight_kg, reps, time_seconds, distance_meters, date')
          .eq('client_id', clientId)
          .eq('user_id', user.id)
          .eq('is_pr', true)
          .gte('date', ninetyDaysAgo)
          .order('date', { ascending: false }),

        // Training count last 90 days
        supabase
          .from('exercise_entries')
          .select('date')
          .eq('client_id', clientId)
          .eq('user_id', user.id)
          .gte('date', ninetyDaysAgo),

        // Training count previous 90 days (for trend)
        supabase
          .from('exercise_entries')
          .select('date')
          .eq('client_id', clientId)
          .eq('user_id', user.id)
          .gte('date', oneEightyDaysAgo)
          .lt('date', ninetyDaysAgo),
      ]);

      if (clientResult.error || !clientResult.data) {
        return null;
      }

      const client = clientResult.data;
      const allEntries = allEntriesResult.data || [];
      const prsThisMonth = prsThisMonthResult.data?.length || 0;
      const prsLast90d = prsLast90DaysResult.data || [];

      // Count unique training days
      const uniqueDays90d = new Set((trainings90dResult.data || []).map(e => e.date)).size;
      const uniqueDaysPrev90d = new Set((prevTrainings90dResult.data || []).map(e => e.date)).size;

      // Calculate volume trend
      let volumeTrend = 0;
      if (uniqueDaysPrev90d > 0) {
        volumeTrend = Math.round(((uniqueDays90d - uniqueDaysPrev90d) / uniqueDaysPrev90d) * 100);
        volumeTrend = Math.max(-99, Math.min(99, volumeTrend));
      } else if (uniqueDays90d > 0) {
        volumeTrend = 99;
      }

      // Calculate active months
      const firstEntryDate = allEntries[0]?.date;
      const activeMonths = firstEntryDate 
        ? differenceInMonths(now, parseISO(firstEntryDate)) + 1
        : 0;

      // Group entries by exercise for sparklines
      const exerciseGroups = new Map<string, typeof allEntries>();
      allEntries.forEach(entry => {
        const key = entry.exercise_id || entry.exercise_name;
        if (!exerciseGroups.has(key)) {
          exerciseGroups.set(key, []);
        }
        exerciseGroups.get(key)!.push(entry);
      });

      // Build top exercises with sparkline data
      const topExercises: ExerciseProgress[] = [];
      
      exerciseGroups.forEach((entries, key) => {
        if (entries.length < 2) return; // Need at least 2 entries for a trend

        const firstEntry = entries[0];
        const lastEntry = entries[entries.length - 1];
        const exerciseData = firstEntry.exercises as any;
        const isTimeBased = exerciseData?.is_time_based || false;
        const exerciseType = exerciseData?.exercise_type_v2 || 'strength';

        // Determine primary metric
        let firstValue = 0;
        let lastValue = 0;
        let unit = 'kg';
        let isInverted = false;

        if (isTimeBased || exerciseType === 'cardio') {
          // Time-based: lower is better
          firstValue = firstEntry.time_seconds || 0;
          lastValue = lastEntry.time_seconds || 0;
          unit = 's';
          isInverted = true;
        } else if (firstEntry.weight_kg && firstEntry.weight_kg > 0) {
          // Strength: weight
          firstValue = firstEntry.weight_kg;
          lastValue = lastEntry.weight_kg || 0;
          unit = 'kg';
        } else if (firstEntry.distance_meters && firstEntry.distance_meters > 0) {
          // Distance-based
          firstValue = firstEntry.distance_meters;
          lastValue = lastEntry.distance_meters || 0;
          unit = 'm';
        } else if (firstEntry.reps) {
          // Reps only
          firstValue = firstEntry.reps;
          lastValue = lastEntry.reps || 0;
          unit = 'reps';
        }

        if (firstValue === 0 && lastValue === 0) return;

        // Calculate change percentage
        let changePercent = 0;
        if (firstValue > 0) {
          if (isInverted) {
            // For time, improvement is decrease
            changePercent = Math.round(((firstValue - lastValue) / firstValue) * 100);
          } else {
            changePercent = Math.round(((lastValue - firstValue) / firstValue) * 100);
          }
        }

        // Build sparkline data
        const sparklineData = entries.map(e => ({
          date: e.date,
          value: isTimeBased 
            ? (e.time_seconds || 0)
            : (e.weight_kg || e.distance_meters || e.reps || 0),
        }));

        // Count PRs for this exercise
        const prCount = entries.filter(e => e.is_pr).length;

        topExercises.push({
          exerciseId: firstEntry.exercise_id,
          exerciseName: firstEntry.exercise_name,
          type: mapExerciseType(exerciseType),
          firstValue,
          lastValue,
          firstDate: firstEntry.date,
          lastDate: lastEntry.date,
          changePercent,
          unit,
          sparklineData,
          entryCount: entries.length,
          prCount,
          isInverted,
        });
      });

      // Sort by entry count and limit
      topExercises.sort((a, b) => b.entryCount - a.entryCount);
      const limitedExercises = topExercises.slice(0, limit);

      // Build recent PRs list
      const recentPRs: RecentPR[] = prsLast90d.slice(0, 10).map(pr => {
        const value = pr.weight_kg || pr.time_seconds || pr.distance_meters || pr.reps || 0;
        const unit = pr.weight_kg ? 'kg' : pr.time_seconds ? 's' : pr.distance_meters ? 'm' : 'reps';

        return {
          id: pr.id,
          date: pr.date,
          exerciseName: pr.exercise_name,
          exerciseId: pr.exercise_id,
          value,
          previousValue: null, // Would need additional query
          unit,
          changePercent: null,
        };
      });

      // Count total PRs
      const totalPRs = allEntries.filter(e => e.is_pr).length;

      return {
        clientId: client.id,
        clientName: client.name,
        totalPRs,
        prsThisMonth,
        prsLast90Days: prsLast90d.length,
        trainingsCount90d: uniqueDays90d,
        activeSince: firstEntryDate || null,
        activeMonths,
        volumeTrend,
        topExercises: limitedExercises,
        recentPRs,
        isLoading: false,
      };
    },
    enabled: !!clientId && !!user?.id,
    staleTime: 2 * 60 * 1000,
  });
}

function mapExerciseType(type: string | null): 'strength' | 'cardio' | 'skill' {
  const t = (type || '').toLowerCase();
  if (t === 'cardio') return 'cardio';
  if (t === 'plyometric' || t === 'skill') return 'skill';
  return 'strength';
}

// Hook for multiple clients overview
export function useAllClientsProgress() {
  const { user } = useAuth();
  const now = new Date();
  const ninetyDaysAgo = format(subDays(now, 90), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['all-clients-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Fetch clients with their recent activity
      const [clientsResult, entriesResult] = await Promise.all([
        supabase
          .from('clients')
          .select('id, name, is_archived')
          .eq('user_id', user.id)
          .eq('is_archived', false)
          .order('name'),

        supabase
          .from('exercise_entries')
          .select('client_id, is_pr, date')
          .eq('user_id', user.id)
          .gte('date', ninetyDaysAgo),
      ]);

      const clients = clientsResult.data || [];
      const entries = entriesResult.data || [];

      // Aggregate per client
      const clientStats = new Map<string, { entries: number; prs: number; lastDate: string }>();
      entries.forEach(e => {
        if (!clientStats.has(e.client_id)) {
          clientStats.set(e.client_id, { entries: 0, prs: 0, lastDate: '' });
        }
        const stats = clientStats.get(e.client_id)!;
        stats.entries++;
        if (e.is_pr) stats.prs++;
        if (e.date > stats.lastDate) stats.lastDate = e.date;
      });

      return clients.map(c => ({
        id: c.id,
        name: c.name,
        entriesCount: clientStats.get(c.id)?.entries || 0,
        prCount: clientStats.get(c.id)?.prs || 0,
        lastActivity: clientStats.get(c.id)?.lastDate || null,
      })).sort((a, b) => b.entriesCount - a.entriesCount);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
