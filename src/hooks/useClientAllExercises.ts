import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subMonths, format } from 'date-fns';

export interface ExerciseProgressEntry {
  date: string;
  weight: number | null;
  reps: number;
  sets: number;
  volume: number;
  isPR: boolean;
  timeSeconds: number | null;
  distanceMeters: number | null;
}

export interface ClientExerciseProgress {
  exerciseName: string;
  count: number;
  lastDate: string;
  maxWeight: number | null;
  bestTime: number | null;
  prCount: number;
  data: ExerciseProgressEntry[];
  isTimeBased: boolean;
}

export function useClientAllExercises(clientId: string | null, months = 6) {
  return useQuery({
    queryKey: ['client-all-exercises', clientId, months],
    queryFn: async () => {
      if (!clientId) return [];
      
      const startDate = format(subMonths(new Date(), months), 'yyyy-MM-dd');
      
      // Fetch all exercise entries for the client (both strength and cardio)
      const { data: entries, error } = await supabase
        .from('exercise_entries')
        .select('exercise_name, date, weight_kg, reps, sets, is_pr, time_seconds, distance_meters')
        .eq('client_id', clientId)
        .gte('date', startDate)
        .or('weight_kg.not.is.null,time_seconds.not.is.null')
        .order('date', { ascending: true });
      
      if (error) throw error;
      if (!entries || entries.length === 0) return [];
      
      // Group by exercise_name
      const grouped: Record<string, ExerciseProgressEntry[]> = {};
      const exerciseStats: Record<string, { 
        maxWeight: number | null; 
        bestTime: number | null;
        prCount: number; 
        lastDate: string;
        isTimeBased: boolean;
      }> = {};
      
      for (const entry of entries) {
        const name = entry.exercise_name;
        const weight = entry.weight_kg;
        const reps = entry.reps || 0;
        const sets = entry.sets || 1;
        const timeSeconds = entry.time_seconds;
        const distanceMeters = entry.distance_meters;
        const isTimeBased = timeSeconds !== null && timeSeconds > 0;
        
        if (!grouped[name]) {
          grouped[name] = [];
          exerciseStats[name] = { 
            maxWeight: null, 
            bestTime: null, 
            prCount: 0, 
            lastDate: entry.date,
            isTimeBased 
          };
        }
        
        grouped[name].push({
          date: entry.date,
          weight,
          reps,
          sets,
          volume: (weight || 0) * reps * sets,
          isPR: entry.is_pr || false,
          timeSeconds,
          distanceMeters,
        });
        
        // Update stats
        if (isTimeBased) {
          // For time-based: lower is better
          if (exerciseStats[name].bestTime === null || (timeSeconds && timeSeconds < exerciseStats[name].bestTime!)) {
            exerciseStats[name].bestTime = timeSeconds;
          }
          exerciseStats[name].isTimeBased = true;
        } else {
          // For strength: higher weight is better
          if (weight && (exerciseStats[name].maxWeight === null || weight > exerciseStats[name].maxWeight!)) {
            exerciseStats[name].maxWeight = weight;
          }
        }
        
        if (entry.is_pr) {
          exerciseStats[name].prCount++;
        }
        if (entry.date > exerciseStats[name].lastDate) {
          exerciseStats[name].lastDate = entry.date;
        }
      }
      
      // Convert to array and sort by count (most used first)
      const result: ClientExerciseProgress[] = Object.entries(grouped)
        .map(([name, data]) => ({
          exerciseName: name,
          count: data.length,
          lastDate: exerciseStats[name].lastDate,
          maxWeight: exerciseStats[name].maxWeight,
          bestTime: exerciseStats[name].bestTime,
          prCount: exerciseStats[name].prCount,
          data,
          isTimeBased: exerciseStats[name].isTimeBased,
        }))
        .sort((a, b) => b.count - a.count);
      
      return result;
    },
    enabled: !!clientId,
  });
}
