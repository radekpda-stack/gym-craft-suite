import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subMonths, format } from 'date-fns';

export interface ExerciseProgressEntry {
  date: string;
  weight: number;
  reps: number;
  sets: number;
  volume: number;
  isPR: boolean;
}

export interface ClientExerciseProgress {
  exerciseName: string;
  count: number;
  lastDate: string;
  maxWeight: number;
  prCount: number;
  data: ExerciseProgressEntry[];
}

export function useClientAllExercises(clientId: string | null, months = 6) {
  return useQuery({
    queryKey: ['client-all-exercises', clientId, months],
    queryFn: async () => {
      if (!clientId) return [];
      
      const startDate = format(subMonths(new Date(), months), 'yyyy-MM-dd');
      
      // Fetch all exercise entries for the client
      const { data: entries, error } = await supabase
        .from('exercise_entries')
        .select('exercise_name, date, weight_kg, reps, sets, is_pr')
        .eq('client_id', clientId)
        .gte('date', startDate)
        .not('weight_kg', 'is', null)
        .order('date', { ascending: true });
      
      if (error) throw error;
      if (!entries || entries.length === 0) return [];
      
      // Group by exercise_name
      const grouped: Record<string, ExerciseProgressEntry[]> = {};
      const exerciseStats: Record<string, { maxWeight: number; prCount: number; lastDate: string }> = {};
      
      for (const entry of entries) {
        const name = entry.exercise_name;
        const weight = entry.weight_kg || 0;
        const reps = entry.reps || 0;
        const sets = entry.sets || 1;
        
        if (!grouped[name]) {
          grouped[name] = [];
          exerciseStats[name] = { maxWeight: 0, prCount: 0, lastDate: entry.date };
        }
        
        grouped[name].push({
          date: entry.date,
          weight,
          reps,
          sets,
          volume: weight * reps * sets,
          isPR: entry.is_pr || false,
        });
        
        // Update stats
        if (weight > exerciseStats[name].maxWeight) {
          exerciseStats[name].maxWeight = weight;
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
          prCount: exerciseStats[name].prCount,
          data,
        }))
        .sort((a, b) => b.count - a.count);
      
      return result;
    },
    enabled: !!clientId,
  });
}
