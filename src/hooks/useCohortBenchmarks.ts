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
 * Compares a single client's best performance against the average of all trainer's clients
 * for each exercise they have in common. Includes strength + cardio entries.
 */
export function useCohortBenchmarks(clientId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cohort-benchmarks', clientId, user?.id],
    queryFn: async (): Promise<CohortBenchmarkData | null> => {
      if (!clientId || !user?.id) return null;

      // Fetch entries from both strength and cardio tables
      const [strengthResult, cardioResult] = await Promise.all([
        supabase
          .from('exercise_entries')
          .select('client_id, exercise_name, weight_kg, reps, time_seconds, distance_meters, exercises(is_time_based, exercise_type_v2)')
          .eq('user_id', user.id),

        supabase
          .from('cardio_entries')
          .select('client_id, exercise_name, duration_seconds, distance_meters, avg_watts')
          .eq('user_id', user.id),
      ]);

      const strengthEntries = strengthResult.data || [];
      const cardioEntries = cardioResult.data || [];

      if (strengthEntries.length === 0 && cardioEntries.length === 0) return null;

      // exerciseName -> { clientId -> bestValue, isInverted, unit }
      const exerciseMap = new Map<string, { clients: Map<string, number>; isInverted: boolean; unit: string }>();

      // Process strength entries
      strengthEntries.forEach(entry => {
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
        } else if (entry.weight_kg) {
          value = entry.weight_kg;
          unit = 'kg';
        } else if (entry.distance_meters) {
          value = entry.distance_meters;
          unit = 'm';
        } else if (entry.reps) {
          value = entry.reps;
          unit = 'reps';
        }

        if (value === 0) return;

        if (!exerciseMap.has(entry.exercise_name)) {
          exerciseMap.set(entry.exercise_name, { clients: new Map(), isInverted, unit });
        }
        const group = exerciseMap.get(entry.exercise_name)!;
        const current = group.clients.get(entry.client_id) || 0;

        // For inverted (time), lower is better -> use Math.min; for others use Math.max
        if (current === 0) {
          group.clients.set(entry.client_id, value);
        } else {
          group.clients.set(
            entry.client_id,
            group.isInverted ? Math.min(current, value) : Math.max(current, value)
          );
        }
      });

      // Process cardio entries
      cardioEntries.forEach(entry => {
        // Use avg_watts if available (higher = better), else duration (lower = better)
        let value = 0;
        let unit = 's';
        let isInverted = true;

        if (entry.avg_watts && entry.avg_watts > 0) {
          value = entry.avg_watts;
          unit = 'W';
          isInverted = false;
        } else if (entry.duration_seconds > 0) {
          value = entry.duration_seconds;
          unit = 's';
          isInverted = true;
        }

        if (value === 0) return;

        const key = `cardio:${entry.exercise_name}`;
        if (!exerciseMap.has(key)) {
          exerciseMap.set(key, { clients: new Map(), isInverted, unit });
        }
        const group = exerciseMap.get(key)!;
        const current = group.clients.get(entry.client_id) || 0;

        if (current === 0) {
          group.clients.set(entry.client_id, value);
        } else {
          group.clients.set(
            entry.client_id,
            group.isInverted ? Math.min(current, value) : Math.max(current, value)
          );
        }
      });

      // Build benchmarks for exercises where the selected client has data
      const exercises: ExerciseBenchmark[] = [];
      const allClientIds = new Set<string>();

      exerciseMap.forEach((group, exerciseName) => {
        const clientValue = group.clients.get(clientId);
        if (clientValue === undefined) return;
        if (group.clients.size < 2) return;

        group.clients.forEach((_, cId) => allClientIds.add(cId));

        // Calculate average excluding the target client
        let sum = 0;
        let count = 0;
        group.clients.forEach((val, cId) => {
          if (cId !== clientId) {
            sum += val;
            count++;
          }
        });

        const avgValue = count > 0 ? Math.round(sum / count) : 0;

        // For inverted metrics, being lower than avg is BETTER (positive diff)
        let diffPercent = 0;
        if (avgValue > 0) {
          if (group.isInverted) {
            // Lower is better: if client is below avg, that's positive
            diffPercent = Math.round(((avgValue - clientValue) / avgValue) * 100);
          } else {
            diffPercent = Math.round(((clientValue - avgValue) / avgValue) * 100);
          }
        }

        // Clean display name (remove cardio: prefix)
        const displayName = exerciseName.startsWith('cardio:') ? exerciseName.slice(7) : exerciseName;

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

      // Sort by most data points first
      exercises.sort((a, b) => b.clientCount - a.clientCount);

      // Limit to top 12 exercises
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
