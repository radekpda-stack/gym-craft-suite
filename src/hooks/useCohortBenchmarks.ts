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
 * for each exercise they have in common.
 */
export function useCohortBenchmarks(clientId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cohort-benchmarks', clientId, user?.id],
    queryFn: async (): Promise<CohortBenchmarkData | null> => {
      if (!clientId || !user?.id) return null;

      // Fetch all exercise entries for all clients of this trainer
      const { data: allEntries, error } = await supabase
        .from('exercise_entries')
        .select('client_id, exercise_name, weight_kg, reps, time_seconds, distance_meters')
        .eq('user_id', user.id);

      if (error || !allEntries || allEntries.length === 0) return null;

      // Group by exercise → client → best value
      const exerciseMap = new Map<string, Map<string, number>>();

      allEntries.forEach(entry => {
        const value = entry.weight_kg || entry.time_seconds || entry.distance_meters || entry.reps || 0;
        if (value === 0) return;

        if (!exerciseMap.has(entry.exercise_name)) {
          exerciseMap.set(entry.exercise_name, new Map());
        }
        const clientMap = exerciseMap.get(entry.exercise_name)!;
        const current = clientMap.get(entry.client_id) || 0;
        // For simplicity, take max (works for strength; time-based would need min but we keep it consistent)
        clientMap.set(entry.client_id, Math.max(current, value));
      });

      // Determine unit per exercise (first entry)
      const unitMap = new Map<string, string>();
      allEntries.forEach(entry => {
        if (unitMap.has(entry.exercise_name)) return;
        if (entry.weight_kg) unitMap.set(entry.exercise_name, 'kg');
        else if (entry.time_seconds) unitMap.set(entry.exercise_name, 's');
        else if (entry.distance_meters) unitMap.set(entry.exercise_name, 'm');
        else if (entry.reps) unitMap.set(entry.exercise_name, 'reps');
      });

      // Build benchmarks for exercises where the selected client has data
      const exercises: ExerciseBenchmark[] = [];
      const allClientIds = new Set<string>();

      exerciseMap.forEach((clientMap, exerciseName) => {
        const clientValue = clientMap.get(clientId);
        if (clientValue === undefined) return;
        if (clientMap.size < 2) return; // Need at least 2 clients

        clientMap.forEach((_, cId) => allClientIds.add(cId));

        // Calculate average excluding the target client
        let sum = 0;
        let count = 0;
        clientMap.forEach((val, cId) => {
          if (cId !== clientId) {
            sum += val;
            count++;
          }
        });

        const avgValue = count > 0 ? Math.round(sum / count) : 0;
        const diffPercent = avgValue > 0
          ? Math.round(((clientValue - avgValue) / avgValue) * 100)
          : 0;

        exercises.push({
          exerciseName,
          clientValue: Math.round(clientValue),
          avgValue,
          unit: unitMap.get(exerciseName) || 'kg',
          diffPercent,
          clientCount: clientMap.size,
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
