import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ClientPerformance {
  clientId: string;
  clientName: string;
  maxWeight: number | null;
  bestTime: number | null; // seconds - lower is better
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
  weight: number | null;
  timeSeconds: number | null;
  reps: number;
  date: string;
}

export interface ExerciseStats {
  exerciseId: string;
  exerciseName: string;
  isTimeBased: boolean;
  totalClients: number;
  totalEntries: number;
  // Strength stats
  globalMaxWeight: number | null;
  globalMaxWeightClient: string | null;
  averageWeight: number | null;
  averageReps: number | null;
  // Time-based stats
  bestTime: number | null; // seconds
  bestTimeClient: string | null;
  averageTime: number | null; // seconds
  totalTimeEntries: number;
  // Extended cardio stats
  averageWatts: number | null;
  bestWatts: number | null;
  averagePace500m: number | null;
  bestPace500m: number | null;
  averageCadence: number | null;
  // Common
  clientPerformances: ClientPerformance[];
  prHistory: PRRecord[];
  mostActiveClient: { name: string; count: number } | null;
}

function formatTimeForDisplay(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function useExerciseStats(exerciseId: string | null) {
  return useQuery({
    queryKey: ['exercise-stats', exerciseId],
    queryFn: async (): Promise<ExerciseStats | null> => {
      if (!exerciseId) return null;

      // Fetch all exercise entries for this exercise including time_seconds and extended metrics
      const { data: entries, error: entriesError } = await supabase
        .from('exercise_entries')
        .select(`
          id,
          client_id,
          weight_kg,
          reps,
          sets,
          time_seconds,
          is_pr,
          date,
          avg_watts,
          max_watts,
          pace_sec_per_500m,
          pace_sec_per_km,
          cadence_spm,
          clients!inner(id, name)
        `)
        .eq('exercise_id', exerciseId)
        .order('date', { ascending: false });

      if (entriesError) throw entriesError;

      // Fetch exercise info including is_time_based
      const { data: exercise, error: exerciseError } = await supabase
        .from('exercises')
        .select('id, name, name_cs, is_time_based, category')
        .eq('id', exerciseId)
        .single();

      if (exerciseError) throw exerciseError;

      // Determine if exercise is time-based
      const isTimeBased = exercise?.is_time_based || 
        exercise?.category === 'cardio' || 
        exercise?.category === 'conditioning';

      if (!entries || entries.length === 0) {
        return {
          exerciseId,
          exerciseName: exercise?.name_cs || exercise?.name || '',
          isTimeBased,
          totalClients: 0,
          totalEntries: 0,
          globalMaxWeight: null,
          globalMaxWeightClient: null,
          averageWeight: null,
          averageReps: null,
          bestTime: null,
          bestTimeClient: null,
          averageTime: null,
          totalTimeEntries: 0,
          averageWatts: null,
          bestWatts: null,
          averagePace500m: null,
          bestPace500m: null,
          averageCadence: null,
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
        times: number[];
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
            times: [],
            reps: [],
            sets: [],
            prCount: 0,
            lastUsed: entry.date,
          });
        }
        
        const client = clientMap.get(clientId)!;
        client.entries.push(entry);
        if (entry.weight_kg) client.weights.push(entry.weight_kg);
        if (entry.time_seconds) client.times.push(entry.time_seconds);
        if (entry.reps) client.reps.push(entry.reps);
        if (entry.sets) client.sets.push(entry.sets);
        if (entry.is_pr) client.prCount++;
        if (entry.date > client.lastUsed) client.lastUsed = entry.date;
      });

      // Calculate client performances
      const clientPerformances: ClientPerformance[] = Array.from(clientMap.values()).map((client) => {
        const maxWeight = client.weights.length > 0 ? Math.max(...client.weights) : null;
        const bestTime = client.times.length > 0 ? Math.min(...client.times) : null;
        const totalSets = client.sets.reduce((a, b) => a + b, 0);
        const totalReps = client.reps.reduce((a, b) => a + b, 0) * (client.sets[0] || 1);
        const totalVolume = client.weights.reduce((sum, w, i) => {
          return sum + (w * (client.reps[i] || 1) * (client.sets[i] || 1));
        }, 0);

        // Calculate trend based on exercise type
        let trend: 'up' | 'down' | 'stable' = 'stable';
        
        if (isTimeBased && client.times.length >= 2) {
          // For time-based, lower is better
          const recentTimes = client.times.slice(0, 3);
          const olderTimes = client.times.slice(3, 6);
          if (recentTimes.length > 0 && olderTimes.length > 0) {
            const recentAvg = recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length;
            const olderAvg = olderTimes.reduce((a, b) => a + b, 0) / olderTimes.length;
            if (recentAvg < olderAvg * 0.95) trend = 'up'; // Improved (lower time)
            else if (recentAvg > olderAvg * 1.05) trend = 'down'; // Worse (higher time)
          }
        } else if (client.weights.length >= 2) {
          // For strength, higher is better
          const recentWeights = client.weights.slice(0, 5);
          const olderWeights = client.weights.slice(5, 10);
          if (recentWeights.length > 0 && olderWeights.length > 0) {
            const recentAvg = recentWeights.reduce((a, b) => a + b, 0) / recentWeights.length;
            const olderAvg = olderWeights.reduce((a, b) => a + b, 0) / olderWeights.length;
            if (recentAvg > olderAvg * 1.05) trend = 'up';
            else if (recentAvg < olderAvg * 0.95) trend = 'down';
          }
        }

        return {
          clientId: client.clientId,
          clientName: client.clientName,
          maxWeight,
          bestTime,
          totalSets,
          totalReps,
          totalVolume,
          lastUsed: client.lastUsed,
          prCount: client.prCount,
          trend,
        };
      });

      // Sort based on exercise type
      if (isTimeBased) {
        clientPerformances.sort((a, b) => {
          if (a.bestTime === null) return 1;
          if (b.bestTime === null) return -1;
          return a.bestTime - b.bestTime; // Lower is better
        });
      } else {
        clientPerformances.sort((a, b) => (b.maxWeight || 0) - (a.maxWeight || 0));
      }

      // PR History - include both weight and time PRs, sorted by performance
      const prHistory: PRRecord[] = entries
        .filter((e) => e.is_pr && (e.weight_kg || e.time_seconds))
        .map((e) => ({
          id: e.id,
          clientId: e.client_id,
          clientName: (e.clients as any)?.name || 'Neznámý',
          weight: e.weight_kg,
          timeSeconds: e.time_seconds,
          reps: e.reps || 0,
          date: e.date,
        }))
        .sort((a, b) => {
          if (isTimeBased) {
            // For time-based: lower time is better (ascending)
            if (!a.timeSeconds) return 1;
            if (!b.timeSeconds) return -1;
            return a.timeSeconds - b.timeSeconds;
          } else {
            // For strength: higher weight is better (descending)
            return (b.weight || 0) - (a.weight || 0);
          }
        })
        .slice(0, 50);

      // Global stats - Strength
      const allWeights = entries.filter((e) => e.weight_kg).map((e) => e.weight_kg!);
      const allReps = entries.filter((e) => e.reps).map((e) => e.reps!);
      const globalMaxWeight = allWeights.length > 0 ? Math.max(...allWeights) : null;
      
      const maxWeightEntry = entries.find((e) => e.weight_kg === globalMaxWeight);
      const globalMaxWeightClient = maxWeightEntry ? (maxWeightEntry.clients as any)?.name : null;

      // Global stats - Time-based
      const allTimes = entries.filter((e) => e.time_seconds).map((e) => e.time_seconds!);
      const bestTime = allTimes.length > 0 ? Math.min(...allTimes) : null;
      const averageTime = allTimes.length > 0 
        ? Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length)
        : null;
      
      const bestTimeEntry = entries.find((e) => e.time_seconds === bestTime);
      const bestTimeClient = bestTimeEntry ? (bestTimeEntry.clients as any)?.name : null;

      // Extended cardio stats - Watts
      const allWatts = entries.filter((e) => (e as any).avg_watts && (e as any).avg_watts > 0).map((e) => (e as any).avg_watts as number);
      const averageWatts = allWatts.length > 0 
        ? Math.round(allWatts.reduce((a, b) => a + b, 0) / allWatts.length)
        : null;
      const bestWatts = allWatts.length > 0 ? Math.max(...allWatts) : null;

      // Extended cardio stats - Pace
      const allPaces = entries.filter((e) => (e as any).pace_sec_per_500m && (e as any).pace_sec_per_500m > 0).map((e) => (e as any).pace_sec_per_500m as number);
      const averagePace500m = allPaces.length > 0 
        ? Math.round(allPaces.reduce((a, b) => a + b, 0) / allPaces.length)
        : null;
      const bestPace500m = allPaces.length > 0 ? Math.min(...allPaces) : null;

      // Extended cardio stats - Cadence
      const allCadences = entries.filter((e) => (e as any).cadence_spm && (e as any).cadence_spm > 0).map((e) => (e as any).cadence_spm as number);
      const averageCadence = allCadences.length > 0 
        ? Math.round(allCadences.reduce((a, b) => a + b, 0) / allCadences.length)
        : null;

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
        isTimeBased,
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
        bestTime,
        bestTimeClient,
        averageTime,
        totalTimeEntries: allTimes.length,
        averageWatts,
        bestWatts,
        averagePace500m,
        bestPace500m,
        averageCadence,
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
        .select('id, name, name_cs, category, difficulty, movement_pattern, equipment, is_archived, is_time_based')
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
