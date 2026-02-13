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
  isInverted: boolean;
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
  volumeTrend: number;
  topExercises: ExerciseProgress[];
  recentPRs: RecentPR[];
  isLoading: boolean;
}

export type ProgressPeriod = '12m' | 'all';

interface UseClientProgressStatsOptions {
  clientId: string | null;
  limit?: number;
  period?: ProgressPeriod;
}

export function useClientProgressStats({ clientId, limit = 6, period = '12m' }: UseClientProgressStatsOptions) {
  const { user } = useAuth();
  const now = new Date();
  const ninetyDaysAgo = format(subDays(now, 90), 'yyyy-MM-dd');
  const oneEightyDaysAgo = format(subDays(now, 180), 'yyyy-MM-dd');
  const thisMonthStart = format(subMonths(now, 0), 'yyyy-MM-01');
  const periodStart = period === '12m' ? format(subMonths(now, 12), 'yyyy-MM-dd') : '2000-01-01';

  return useQuery({
    queryKey: ['client-progress-stats', clientId, user?.id, limit, period],
    queryFn: async (): Promise<ClientProgressStats | null> => {
      if (!clientId || !user?.id) return null;

      const [
        clientResult,
        strengthEntriesResult,
        cardioEntriesResult,
        skillEntriesResult,
        prsThisMonthStrength,
        prsThisMonthCardio,
        prsThisMonthSkill,
        trainings90dStrength,
        trainings90dCardio,
        trainings90dSkill,
        prevTrainings90dStrength,
        prevTrainings90dCardio,
        prevTrainings90dSkill,
      ] = await Promise.all([
        supabase
          .from('clients')
          .select('id, name, created_at')
          .eq('id', clientId)
          .eq('user_id', user.id)
          .single(),

        // Strength entries
        supabase
          .from('exercise_entries')
          .select('id, exercise_id, exercise_name, weight_kg, reps, time_seconds, distance_meters, is_pr, date, exercises(exercise_type_v2, is_time_based)')
          .eq('client_id', clientId)
          .eq('user_id', user.id)
          .gte('date', periodStart)
          .order('date', { ascending: true }),

        // Cardio entries
        supabase
          .from('cardio_entries')
          .select('id, exercise_id, exercise_name, duration_seconds, distance_meters, avg_speed_kmh, avg_watts, is_pr, date')
          .eq('client_id', clientId)
          .eq('user_id', user.id)
          .gte('date', periodStart)
          .order('date', { ascending: true }),

        // Skill entries
        supabase
          .from('skill_entries')
          .select('id, exercise_id, exercise_name, duration_seconds, attempts, successful, is_breakthrough, date')
          .eq('client_id', clientId)
          .eq('user_id', user.id)
          .gte('date', periodStart)
          .order('date', { ascending: true }),

        // PRs this month - strength
        supabase
          .from('exercise_entries')
          .select('id')
          .eq('client_id', clientId)
          .eq('user_id', user.id)
          .eq('is_pr', true)
          .gte('date', thisMonthStart),

        // PRs this month - cardio
        supabase
          .from('cardio_entries')
          .select('id')
          .eq('client_id', clientId)
          .eq('user_id', user.id)
          .eq('is_pr', true)
          .gte('date', thisMonthStart),

        // PRs this month - skill (breakthroughs)
        supabase
          .from('skill_entries')
          .select('id')
          .eq('client_id', clientId)
          .eq('user_id', user.id)
          .eq('is_breakthrough', true)
          .gte('date', thisMonthStart),

        // Training count last 90 days
        supabase
          .from('exercise_entries')
          .select('date')
          .eq('client_id', clientId)
          .eq('user_id', user.id)
          .gte('date', ninetyDaysAgo),

        supabase
          .from('cardio_entries')
          .select('date')
          .eq('client_id', clientId)
          .eq('user_id', user.id)
          .gte('date', ninetyDaysAgo),

        supabase
          .from('skill_entries')
          .select('date')
          .eq('client_id', clientId)
          .eq('user_id', user.id)
          .gte('date', ninetyDaysAgo),

        // Training count previous 90 days
        supabase
          .from('exercise_entries')
          .select('date')
          .eq('client_id', clientId)
          .eq('user_id', user.id)
          .gte('date', oneEightyDaysAgo)
          .lt('date', ninetyDaysAgo),

        supabase
          .from('cardio_entries')
          .select('date')
          .eq('client_id', clientId)
          .eq('user_id', user.id)
          .gte('date', oneEightyDaysAgo)
          .lt('date', ninetyDaysAgo),

        supabase
          .from('skill_entries')
          .select('date')
          .eq('client_id', clientId)
          .eq('user_id', user.id)
          .gte('date', oneEightyDaysAgo)
          .lt('date', ninetyDaysAgo),
      ]);

      if (clientResult.error || !clientResult.data) return null;

      const client = clientResult.data;
      const strengthEntries = strengthEntriesResult.data || [];
      const cardioEntries = cardioEntriesResult.data || [];
      const skillEntries = skillEntriesResult.data || [];

      const prsThisMonth = (prsThisMonthStrength.data?.length || 0) + (prsThisMonthCardio.data?.length || 0) + (prsThisMonthSkill.data?.length || 0);

      // Count unique training days from all tables
      const allDates90d = [
        ...(trainings90dStrength.data || []).map(e => e.date),
        ...(trainings90dCardio.data || []).map(e => e.date),
        ...(trainings90dSkill.data || []).map(e => e.date),
      ];
      const uniqueDays90d = new Set(allDates90d).size;

      const allDatesPrev90d = [
        ...(prevTrainings90dStrength.data || []).map(e => e.date),
        ...(prevTrainings90dCardio.data || []).map(e => e.date),
        ...(prevTrainings90dSkill.data || []).map(e => e.date),
      ];
      const uniqueDaysPrev90d = new Set(allDatesPrev90d).size;

      // Calculate volume trend
      let volumeTrend = 0;
      if (uniqueDaysPrev90d > 0) {
        volumeTrend = Math.round(((uniqueDays90d - uniqueDaysPrev90d) / uniqueDaysPrev90d) * 100);
        volumeTrend = Math.max(-99, Math.min(99, volumeTrend));
      } else if (uniqueDays90d > 0) {
        volumeTrend = 99;
      }

      // Calculate active months from earliest entry
      const allDates = [
        ...strengthEntries.map(e => e.date),
        ...cardioEntries.map(e => e.date),
        ...skillEntries.map(e => e.date),
      ].sort();
      const firstEntryDate = allDates[0];
      const activeMonths = firstEntryDate
        ? differenceInMonths(now, parseISO(firstEntryDate)) + 1
        : 0;

      // Group entries by exercise for sparklines
      const exerciseGroups = new Map<string, {
        entries: { date: string; value: number; isPr: boolean }[];
        name: string;
        exerciseId: string | null;
        type: 'strength' | 'cardio' | 'skill';
        unit: string;
        isInverted: boolean;
      }>();

      // Process strength entries
      strengthEntries.forEach(entry => {
        const key = entry.exercise_id || entry.exercise_name;
        const exerciseData = entry.exercises as any;
        const isTimeBased = exerciseData?.is_time_based || false;
        const exerciseType = exerciseData?.exercise_type_v2 || 'strength';

        let value = 0;
        let unit = 'kg';
        let isInverted = false;

        if (isTimeBased || exerciseType === 'cardio') {
          value = entry.time_seconds || 0;
          unit = 's';
          isInverted = true;
        } else if (entry.weight_kg && entry.weight_kg > 0) {
          value = entry.weight_kg;
          unit = 'kg';
        } else if (entry.distance_meters && entry.distance_meters > 0) {
          value = entry.distance_meters;
          unit = 'm';
        } else if (entry.reps) {
          value = entry.reps;
          unit = 'reps';
        }

        if (value === 0) return;

        if (!exerciseGroups.has(key)) {
          exerciseGroups.set(key, {
            entries: [],
            name: entry.exercise_name,
            exerciseId: entry.exercise_id,
            type: mapExerciseType(exerciseType),
            unit,
            isInverted,
          });
        }
        exerciseGroups.get(key)!.entries.push({
          date: entry.date,
          value,
          isPr: entry.is_pr || false,
        });
      });

      // Process cardio entries
      cardioEntries.forEach(entry => {
        const key = entry.exercise_id || `cardio-${entry.exercise_name}`;

        let value = 0;
        let unit = 's';
        let isInverted = true;

        if (entry.avg_watts && entry.avg_watts > 0) {
          value = entry.avg_watts;
          unit = 'W';
          isInverted = false;
        } else if (entry.distance_meters && entry.distance_meters > 0 && entry.duration_seconds > 0) {
          value = Math.round((entry.distance_meters / entry.duration_seconds) * 3.6 * 10) / 10;
          unit = 'km/h';
          isInverted = false;
        } else {
          value = entry.duration_seconds;
          unit = 's';
          isInverted = true;
        }

        if (value === 0) return;

        if (!exerciseGroups.has(key)) {
          exerciseGroups.set(key, {
            entries: [],
            name: entry.exercise_name,
            exerciseId: entry.exercise_id,
            type: 'cardio',
            unit,
            isInverted,
          });
        }
        exerciseGroups.get(key)!.entries.push({
          date: entry.date,
          value,
          isPr: entry.is_pr || false,
        });
      });

      // Process skill entries
      skillEntries.forEach(entry => {
        const key = entry.exercise_id || `skill-${entry.exercise_name}`;

        // Primary metric: success rate (successful/attempts) if available, else duration
        let value = 0;
        let unit = '';
        let isInverted = false;

        if (entry.attempts && entry.attempts > 0 && entry.successful != null) {
          value = Math.round((entry.successful / entry.attempts) * 100);
          unit = '%';
          isInverted = false; // higher success rate = better
        } else if (entry.duration_seconds && entry.duration_seconds > 0) {
          value = entry.duration_seconds;
          unit = 's';
          isInverted = true; // lower time = better
        } else if (entry.successful != null) {
          value = entry.successful;
          unit = 'úsp.';
          isInverted = false;
        }

        if (value === 0) return;

        if (!exerciseGroups.has(key)) {
          exerciseGroups.set(key, {
            entries: [],
            name: entry.exercise_name,
            exerciseId: entry.exercise_id,
            type: 'skill',
            unit,
            isInverted,
          });
        }
        exerciseGroups.get(key)!.entries.push({
          date: entry.date,
          value,
          isPr: entry.is_breakthrough || false,
        });
      });

      // Build top exercises with sparkline data
      const topExercises: ExerciseProgress[] = [];

      exerciseGroups.forEach((group) => {
        if (group.entries.length < 2) return;

        const sorted = group.entries.sort((a, b) => a.date.localeCompare(b.date));
        const firstValue = sorted[0].value;
        const lastValue = sorted[sorted.length - 1].value;

        let changePercent = 0;
        if (firstValue > 0) {
          if (group.isInverted) {
            changePercent = Math.round(((firstValue - lastValue) / firstValue) * 100);
          } else {
            changePercent = Math.round(((lastValue - firstValue) / firstValue) * 100);
          }
        }

        const sparklineData = sorted.map(e => ({ date: e.date, value: e.value }));
        const prCount = sorted.filter(e => e.isPr).length;

        topExercises.push({
          exerciseId: group.exerciseId,
          exerciseName: group.name,
          type: group.type,
          firstValue,
          lastValue,
          firstDate: sorted[0].date,
          lastDate: sorted[sorted.length - 1].date,
          changePercent,
          unit: group.unit,
          sparklineData,
          entryCount: sorted.length,
          prCount,
          isInverted: group.isInverted,
        });
      });

      // Sort by entry count and limit
      topExercises.sort((a, b) => b.entryCount - a.entryCount);
      const limitedExercises = topExercises.slice(0, limit);

      // Build recent PRs list from all tables
      const allPRs: RecentPR[] = [];

      // Strength PRs
      strengthEntries.filter(e => e.is_pr).forEach(pr => {
        const value = pr.weight_kg || pr.time_seconds || pr.distance_meters || pr.reps || 0;
        const unit = pr.weight_kg ? 'kg' : pr.time_seconds ? 's' : pr.distance_meters ? 'm' : 'reps';
        allPRs.push({ id: pr.id, date: pr.date, exerciseName: pr.exercise_name, exerciseId: pr.exercise_id, value, previousValue: null, unit, changePercent: null });
      });

      // Cardio PRs
      cardioEntries.filter(e => e.is_pr).forEach(pr => {
        const value = pr.avg_watts || pr.duration_seconds || 0;
        const unit = pr.avg_watts ? 'W' : 's';
        allPRs.push({ id: pr.id, date: pr.date, exerciseName: pr.exercise_name, exerciseId: pr.exercise_id, value, previousValue: null, unit, changePercent: null });
      });

      // Skill breakthroughs
      skillEntries.filter(e => e.is_breakthrough).forEach(pr => {
        const value = pr.successful || pr.duration_seconds || 0;
        const unit = pr.successful != null ? 'úsp.' : 's';
        allPRs.push({ id: pr.id, date: pr.date, exerciseName: pr.exercise_name, exerciseId: pr.exercise_id, value, previousValue: null, unit, changePercent: null });
      });

      // Sort PRs by date desc
      allPRs.sort((a, b) => b.date.localeCompare(a.date));
      const recentPRs = allPRs.slice(0, 10);

      // Count total PRs
      const totalPRs = strengthEntries.filter(e => e.is_pr).length 
        + cardioEntries.filter(e => e.is_pr).length 
        + skillEntries.filter(e => e.is_breakthrough).length;

      return {
        clientId: client.id,
        clientName: client.name,
        totalPRs,
        prsThisMonth,
        prsLast90Days: allPRs.filter(p => p.date >= ninetyDaysAgo).length,
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

// Hook for multiple clients overview - includes all 3 tables
export function useAllClientsProgress() {
  const { user } = useAuth();
  const now = new Date();
  const ninetyDaysAgo = format(subDays(now, 90), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['all-clients-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const [clientsResult, strengthResult, cardioResult, skillResult] = await Promise.all([
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

        supabase
          .from('cardio_entries')
          .select('client_id, is_pr, date')
          .eq('user_id', user.id)
          .gte('date', ninetyDaysAgo),

        supabase
          .from('skill_entries')
          .select('client_id, is_breakthrough, date')
          .eq('user_id', user.id)
          .gte('date', ninetyDaysAgo),
      ]);

      const clients = clientsResult.data || [];
      
      // Normalize all entries
      const allEntries = [
        ...(strengthResult.data || []).map(e => ({ client_id: e.client_id, isPr: e.is_pr || false, date: e.date })),
        ...(cardioResult.data || []).map(e => ({ client_id: e.client_id, isPr: e.is_pr || false, date: e.date })),
        ...(skillResult.data || []).map(e => ({ client_id: e.client_id, isPr: e.is_breakthrough || false, date: e.date })),
      ];

      // Aggregate per client
      const clientStats = new Map<string, { entries: number; prs: number; lastDate: string }>();
      allEntries.forEach(e => {
        if (!clientStats.has(e.client_id)) {
          clientStats.set(e.client_id, { entries: 0, prs: 0, lastDate: '' });
        }
        const stats = clientStats.get(e.client_id)!;
        stats.entries++;
        if (e.isPr) stats.prs++;
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
