import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PercentileData {
  exercise: string;
  exerciseId: string;
  clientValue: number;
  percentile: number;
  top10: number;
  top25: number;
  median: number;
  allValues: number[];
}

interface BenchmarkData {
  percentiles: PercentileData[];
  overallPercentile: number;
  prCount: number;
  prRank: number;
  totalClients: number;
  strongestExercise: { name: string; percentile: number } | null;
  weakestExercise: { name: string; percentile: number } | null;
}

function calculatePercentile(value: number, sortedValues: number[]): number {
  if (sortedValues.length === 0) return 0;
  const index = sortedValues.findIndex(v => v >= value);
  if (index === -1) return 100;
  return Math.round((index / sortedValues.length) * 100);
}

function estimate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export function usePerformanceBenchmarks(clientId?: string) {
  return useQuery({
    queryKey: ['performance-benchmarks', clientId],
    queryFn: async (): Promise<BenchmarkData | null> => {
      if (!clientId) return null;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get all exercise entries for this user
      const { data: allEntries, error } = await supabase
        .from('exercise_entries')
        .select('client_id, exercise_name, weight_kg, reps, is_pr')
        .eq('user_id', user.id);

      if (error || !allEntries || allEntries.length === 0) return null;

      // Group entries by exercise and calculate best 1RM for each client
      const exerciseClientBests: Record<string, Record<string, number>> = {};
      const clientPRCounts: Record<string, number> = {};

      allEntries.forEach(entry => {
        if (!entry.weight_kg || !entry.reps) return;
        
        const est1RM = estimate1RM(entry.weight_kg, entry.reps);
        const exercise = entry.exercise_name;
        const client = entry.client_id;

        if (!exerciseClientBests[exercise]) {
          exerciseClientBests[exercise] = {};
        }
        exerciseClientBests[exercise][client] = Math.max(
          exerciseClientBests[exercise][client] || 0,
          est1RM
        );

        if (entry.is_pr) {
          clientPRCounts[client] = (clientPRCounts[client] || 0) + 1;
        }
      });

      // Calculate percentiles for current client
      const percentiles: PercentileData[] = [];

      Object.entries(exerciseClientBests).forEach(([exercise, clientValues]) => {
        const clientValue = clientValues[clientId];
        if (!clientValue) return;

        const allValues = Object.values(clientValues).sort((a, b) => a - b);
        if (allValues.length < 3) return; // Need at least 3 clients for meaningful percentile

        const percentile = calculatePercentile(clientValue, allValues);
        const top10 = allValues[Math.floor(allValues.length * 0.9)] || allValues[allValues.length - 1];
        const top25 = allValues[Math.floor(allValues.length * 0.75)] || allValues[allValues.length - 1];
        const median = allValues[Math.floor(allValues.length * 0.5)] || allValues[0];

        percentiles.push({
          exercise,
          exerciseId: exercise,
          clientValue,
          percentile,
          top10,
          top25,
          median,
          allValues,
        });
      });

      // Sort by percentile descending
      percentiles.sort((a, b) => b.percentile - a.percentile);

      // Calculate overall percentile (average of top 5 exercises)
      const topExercises = percentiles.slice(0, 5);
      const overallPercentile = topExercises.length > 0
        ? Math.round(topExercises.reduce((sum, p) => sum + p.percentile, 0) / topExercises.length)
        : 0;

      // Calculate PR rank
      const allPRCounts = Object.entries(clientPRCounts)
        .map(([id, count]) => ({ id, count }))
        .sort((a, b) => b.count - a.count);
      
      const prCount = clientPRCounts[clientId] || 0;
      const prRank = allPRCounts.findIndex(c => c.id === clientId) + 1;
      const totalClients = Object.keys(clientPRCounts).length;

      // Strongest and weakest exercises
      const strongestExercise = percentiles.length > 0
        ? { name: percentiles[0].exercise, percentile: percentiles[0].percentile }
        : null;
      const weakestExercise = percentiles.length > 1
        ? { name: percentiles[percentiles.length - 1].exercise, percentile: percentiles[percentiles.length - 1].percentile }
        : null;

      return {
        percentiles,
        overallPercentile,
        prCount,
        prRank: prRank || totalClients,
        totalClients,
        strongestExercise,
        weakestExercise,
      };
    },
    enabled: !!clientId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
