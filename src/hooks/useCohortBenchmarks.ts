import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ExerciseBenchmark {
  exerciseName: string;
  clientValue: number;
  avgValue: number;
  unit: string;
  diffPercent: number;
  clientCount: number;
  isInverted: boolean;
}

interface CohortBenchmarkData {
  exercises: ExerciseBenchmark[];
  totalClients: number;
  aboveAvgCount: number;
  atAvgCount: number;
  belowAvgCount: number;
}

/**
 * Compares a single client's best performance against the average of all trainer's clients.
 * Includes strength, cardio, and skill entries.
 */
export function useCohortBenchmarks(clientId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cohort-benchmarks', clientId, user?.id],
    queryFn: async (): Promise<CohortBenchmarkData | null> => {
      if (!clientId || !user?.id) return null;

      const [strengthResult, cardioResult, skillResult] = await Promise.all([
        supabase
          .from('exercise_entries')
          .select('client_id, exercise_name, weight_kg, reps, time_seconds, distance_meters, exercises(is_time_based, exercise_type_v2)')
          .eq('user_id', user.id),
        supabase
          .from('cardio_entries')
          .select('client_id, exercise_name, duration_seconds, distance_meters, avg_watts')
          .eq('user_id', user.id),
        supabase
          .from('skill_entries')
          .select('client_id, exercise_name, duration_seconds, attempts, successful')
          .eq('user_id', user.id),
      ]);

      const strengthEntries = strengthResult.data || [];
      const cardioEntries = cardioResult.data || [];
      const skillEntries = skillResult.data || [];

      if (strengthEntries.length === 0 && cardioEntries.length === 0 && skillEntries.length === 0) return null;

      // exerciseName -> { clientId -> bestValue, isInverted, unit }
      const exerciseMap = new Map<string, { clients: Map<string, number>; isInverted: boolean; unit: string }>();

      const upsertBest = (mapKey: string, cId: string, value: number, unit: string, isInverted: boolean) => {
        if (value === 0) return;
        if (!exerciseMap.has(mapKey)) {
          exerciseMap.set(mapKey, { clients: new Map(), isInverted, unit });
        }
        const group = exerciseMap.get(mapKey)!;
        const current = group.clients.get(cId) || 0;
        if (current === 0) {
          group.clients.set(cId, value);
        } else {
          group.clients.set(cId, group.isInverted ? Math.min(current, value) : Math.max(current, value));
        }
      };

      // Process strength entries
      strengthEntries.forEach(entry => {
        const exerciseData = entry.exercises as any;
        const isTimeBased = exerciseData?.is_time_based || false;
        const exerciseType = exerciseData?.exercise_type_v2 || 'strength';

        let value = 0, unit = 'kg', isInverted = false;

        if (isTimeBased || exerciseType === 'cardio') {
          value = entry.time_seconds || 0; unit = 's'; isInverted = true;
        } else if (entry.weight_kg) {
          value = entry.weight_kg; unit = 'kg';
        } else if (entry.distance_meters) {
          value = entry.distance_meters; unit = 'm';
        } else if (entry.reps) {
          value = entry.reps; unit = 'reps';
        }

        upsertBest(entry.exercise_name, entry.client_id, value, unit, isInverted);
      });

      // Process cardio entries
      cardioEntries.forEach(entry => {
        let value = 0, unit = 's', isInverted = true;

        if (entry.avg_watts && entry.avg_watts > 0) {
          value = entry.avg_watts; unit = 'W'; isInverted = false;
        } else if (entry.duration_seconds > 0) {
          value = entry.duration_seconds; unit = 's'; isInverted = true;
        }

        upsertBest(`cardio:${entry.exercise_name}`, entry.client_id, value, unit, isInverted);
      });

      // Process skill entries
      skillEntries.forEach(entry => {
        let value = 0, unit = '', isInverted = false;

        if (entry.attempts && entry.attempts > 0 && entry.successful != null) {
          // Success rate — higher is better
          value = Math.round((entry.successful / entry.attempts) * 100);
          unit = '%';
          isInverted = false;
        } else if (entry.duration_seconds && entry.duration_seconds > 0) {
          value = entry.duration_seconds;
          unit = 's';
          isInverted = true;
        }

        upsertBest(`skill:${entry.exercise_name}`, entry.client_id, value, unit, isInverted);
      });

      // Build benchmarks
      const exercises: ExerciseBenchmark[] = [];
      const allClientIds = new Set<string>();

      exerciseMap.forEach((group, exerciseName) => {
        const clientValue = group.clients.get(clientId);
        if (clientValue === undefined) return;
        if (group.clients.size < 2) return;

        group.clients.forEach((_, cId) => allClientIds.add(cId));

        let sum = 0, count = 0;
        group.clients.forEach((val, cId) => {
          if (cId !== clientId) { sum += val; count++; }
        });

        const avgValue = count > 0 ? Math.round(sum / count) : 0;

        let diffPercent = 0;
        if (avgValue > 0) {
          diffPercent = group.isInverted
            ? Math.round(((avgValue - clientValue) / avgValue) * 100)
            : Math.round(((clientValue - avgValue) / avgValue) * 100);
        }

        // Clean display name
        const displayName = exerciseName.startsWith('cardio:') ? exerciseName.slice(7)
          : exerciseName.startsWith('skill:') ? exerciseName.slice(6)
          : exerciseName;

        exercises.push({
          exerciseName: displayName,
          clientValue: Math.round(clientValue),
          avgValue,
          unit: group.unit,
          diffPercent,
          clientCount: group.clients.size,
          isInverted: group.isInverted,
        });
      });

      exercises.sort((a, b) => b.clientCount - a.clientCount);
      const limited = exercises.slice(0, 12);

      const aboveAvgCount = limited.filter(e => e.diffPercent > 5).length;
      const belowAvgCount = limited.filter(e => e.diffPercent < -5).length;
      const atAvgCount = limited.length - aboveAvgCount - belowAvgCount;

      return {
        exercises: limited,
        totalClients: allClientIds.size,
        aboveAvgCount,
        atAvgCount,
        belowAvgCount,
      };
    },
    enabled: !!clientId && !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
