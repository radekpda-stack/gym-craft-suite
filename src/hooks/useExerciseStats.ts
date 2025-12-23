import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ClientPerformance {
  clientId: string;
  clientName: string;
  maxWeight: number | null;
  totalSets: number;
  totalReps: number;
  totalVolume: number;
  lastUsed: string;
  prCount: number;
  trend: 'up' | 'down' | 'stable';
}

interface PRRecord {
  id: string;
  clientId: string;
  clientName: string;
  weight: number;
  reps: number;
  date: string;
}

export interface ExerciseStats {
  exerciseId: string;
  exerciseName: string;
  totalClients: number;
  totalEntries: number;
  globalMaxWeight: number | null;
  globalMaxWeightClient: string | null;
  averageWeight: number | null;
  averageReps: number | null;
  clientPerformances: ClientPerformance[];
  prHistory: PRRecord[];
  mostActiveClient: { name: string; count: number } | null;
}

export function useExerciseStats(exerciseId: string | null) {
  return useQuery({
    queryKey: ['exercise-stats', exerciseId],
    queryFn: async (): Promise<ExerciseStats | null> => {
      if (!exerciseId) return null;

      // Fetch all exercise entries for this exercise
      const { data: entries, error: entriesError } = await supabase
        .from('exercise_entries')
        .select(`
          id,
          client_id,
          weight_kg,
          reps,
          sets,
          is_pr,
          date,
          clients!inner(id, name)
        `)
        .eq('exercise_id', exerciseId)
        .order('date', { ascending: false });

      if (entriesError) throw entriesError;

      // Fetch exercise info
      const { data: exercise, error: exerciseError } = await supabase
        .from('exercises')
        .select('id, name, name_cs')
        .eq('id', exerciseId)
        .single();

      if (exerciseError) throw exerciseError;

      if (!entries || entries.length === 0) {
        return {
          exerciseId,
          exerciseName: exercise?.name_cs || exercise?.name || '',
          totalClients: 0,
          totalEntries: 0,
          globalMaxWeight: null,
          globalMaxWeightClient: null,
          averageWeight: null,
          averageReps: null,
          clientPerformances: [],
          prHistory: [],
          mostActiveClient: null,
        };
      }

      // Process entries
      const clientMap = new Map<string, {
        clientId: string;
        clientName: string;
        entries: typeof entries;
        weights: number[];
        reps: number[];
        sets: number[];
        prCount: number;
        lastUsed: string;
      }>();

      entries.forEach((entry) => {
        const clientId = entry.client_id;
        const clientName = (entry.clients as any)?.name || 'Neznámý klient';
        
        if (!clientMap.has(clientId)) {
          clientMap.set(clientId, {
            clientId,
            clientName,
            entries: [],
            weights: [],
            reps: [],
            sets: [],
            prCount: 0,
            lastUsed: entry.date,
          });
        }
        
        const client = clientMap.get(clientId)!;
        client.entries.push(entry);
        if (entry.weight_kg) client.weights.push(entry.weight_kg);
        if (entry.reps) client.reps.push(entry.reps);
        if (entry.sets) client.sets.push(entry.sets);
        if (entry.is_pr) client.prCount++;
        if (entry.date > client.lastUsed) client.lastUsed = entry.date;
      });

      // Calculate client performances
      const clientPerformances: ClientPerformance[] = Array.from(clientMap.values()).map((client) => {
        const maxWeight = client.weights.length > 0 ? Math.max(...client.weights) : null;
        const totalSets = client.sets.reduce((a, b) => a + b, 0);
        const totalReps = client.reps.reduce((a, b) => a + b, 0) * (client.sets[0] || 1);
        const totalVolume = client.weights.reduce((sum, w, i) => {
          return sum + (w * (client.reps[i] || 1) * (client.sets[i] || 1));
        }, 0);

        // Calculate trend (compare last 5 entries vs previous 5)
        const recentWeights = client.weights.slice(0, 5);
        const olderWeights = client.weights.slice(5, 10);
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (recentWeights.length > 0 && olderWeights.length > 0) {
          const recentAvg = recentWeights.reduce((a, b) => a + b, 0) / recentWeights.length;
          const olderAvg = olderWeights.reduce((a, b) => a + b, 0) / olderWeights.length;
          if (recentAvg > olderAvg * 1.05) trend = 'up';
          else if (recentAvg < olderAvg * 0.95) trend = 'down';
        }

        return {
          clientId: client.clientId,
          clientName: client.clientName,
          maxWeight,
          totalSets,
          totalReps,
          totalVolume,
          lastUsed: client.lastUsed,
          prCount: client.prCount,
          trend,
        };
      });

      // Sort by max weight
      clientPerformances.sort((a, b) => (b.maxWeight || 0) - (a.maxWeight || 0));

      // PR History
      const prHistory: PRRecord[] = entries
        .filter((e) => e.is_pr && e.weight_kg)
        .map((e) => ({
          id: e.id,
          clientId: e.client_id,
          clientName: (e.clients as any)?.name || 'Neznámý',
          weight: e.weight_kg!,
          reps: e.reps || 0,
          date: e.date,
        }))
        .slice(0, 50);

      // Global stats
      const allWeights = entries.filter((e) => e.weight_kg).map((e) => e.weight_kg!);
      const allReps = entries.filter((e) => e.reps).map((e) => e.reps!);
      const globalMaxWeight = allWeights.length > 0 ? Math.max(...allWeights) : null;
      
      const maxWeightEntry = entries.find((e) => e.weight_kg === globalMaxWeight);
      const globalMaxWeightClient = maxWeightEntry ? (maxWeightEntry.clients as any)?.name : null;

      // Most active client
      let mostActiveClient: { name: string; count: number } | null = null;
      let maxCount = 0;
      clientMap.forEach((client) => {
        if (client.entries.length > maxCount) {
          maxCount = client.entries.length;
          mostActiveClient = { name: client.clientName, count: maxCount };
        }
      });

      return {
        exerciseId,
        exerciseName: exercise?.name_cs || exercise?.name || '',
        totalClients: clientMap.size,
        totalEntries: entries.length,
        globalMaxWeight,
        globalMaxWeightClient,
        averageWeight: allWeights.length > 0 
          ? Math.round(allWeights.reduce((a, b) => a + b, 0) / allWeights.length * 10) / 10 
          : null,
        averageReps: allReps.length > 0
          ? Math.round(allReps.reduce((a, b) => a + b, 0) / allReps.length * 10) / 10
          : null,
        clientPerformances,
        prHistory,
        mostActiveClient,
      };
    },
    enabled: !!exerciseId,
  });
}

// Hook for getting exercise usage count across all entries
export function useExercisesWithUsage() {
  return useQuery({
    queryKey: ['exercises-with-usage'],
    queryFn: async () => {
      // Get all exercises
      const { data: exercises, error: exercisesError } = await supabase
        .from('exercises')
        .select('id, name, name_cs, category, difficulty, movement_pattern, equipment, is_archived')
        .eq('is_archived', false)
        .order('category')
        .order('name');

      if (exercisesError) throw exercisesError;

      // Get usage counts - group by exercise_id
      const { data: usageCounts, error: usageError } = await supabase
        .from('exercise_entries')
        .select('exercise_id');

      if (usageError) throw usageError;

      // Count by exercise_id
      const countMap = new Map<string, number>();
      usageCounts?.forEach((entry) => {
        if (entry.exercise_id) {
          countMap.set(entry.exercise_id, (countMap.get(entry.exercise_id) || 0) + 1);
        }
      });

      // Get unique clients per exercise
      const clientCountMap = new Map<string, Set<string>>();
      const { data: clientData } = await supabase
        .from('exercise_entries')
        .select('exercise_id, client_id');
      
      clientData?.forEach((entry) => {
        if (entry.exercise_id) {
          if (!clientCountMap.has(entry.exercise_id)) {
            clientCountMap.set(entry.exercise_id, new Set());
          }
          clientCountMap.get(entry.exercise_id)!.add(entry.client_id);
        }
      });

      return exercises?.map((ex) => ({
        ...ex,
        usageCount: countMap.get(ex.id) || 0,
        clientCount: clientCountMap.get(ex.id)?.size || 0,
      })) || [];
    },
  });
}
