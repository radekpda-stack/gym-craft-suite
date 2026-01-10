import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ExercisePR {
  id: string;
  exerciseName: string;
  exerciseId: string | null;
  bestValue: number;
  bestDisplay: string;
  unit: string;
  metricType: 'weight' | 'time' | 'reps' | 'distance';
  achievedAt: string;
  isBodyweight: boolean;
  side: 'left' | 'right' | 'both' | 'none' | null;
}

/**
 * Fetches personal records from exercise_entries for a client.
 * Aggregates best weight/time/reps per exercise.
 */
export function useClientExercisePRs(clientId: string | null | undefined) {
  return useQuery({
    queryKey: ['client-exercise-prs', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const prs: ExercisePR[] = [];

      // Get all exercise entries for this client
      const { data: entries, error } = await supabase
        .from('exercise_entries')
        .select('id, exercise_name, exercise_id, weight_kg, reps, is_bodyweight, date, time_seconds, side')
        .eq('client_id', clientId)
        .order('date', { ascending: false });

      if (error) throw error;

      // Group by exercise and find best values
      const exerciseMap = new Map<string, {
        id: string;
        exerciseId: string | null;
        exerciseName: string;
        maxWeight: number;
        maxWeightReps: number;
        maxWeightDate: string;
        maxReps: number;
        maxRepsDate: string;
        maxTime: number;
        maxTimeDate: string;
        isBodyweight: boolean;
        hasWeight: boolean;
        hasTime: boolean;
        side: 'left' | 'right' | 'both' | 'none' | null;
      }>();

      for (const entry of entries || []) {
        // Group by exercise name + side for unilateral exercises
        const entrySide = (entry.side as 'left' | 'right' | 'both' | 'none') || 'none';
        const key = entrySide === 'left' || entrySide === 'right' 
          ? `${entry.exercise_name}__${entrySide}` 
          : entry.exercise_name;
        const existing = exerciseMap.get(key);
        
        if (!existing) {
          exerciseMap.set(key, {
            id: entry.id,
            exerciseId: entry.exercise_id,
            exerciseName: entry.exercise_name,
            maxWeight: entry.weight_kg || 0,
            maxWeightReps: entry.reps || 0,
            maxWeightDate: entry.date,
            maxReps: entry.reps || 0,
            maxRepsDate: entry.date,
            maxTime: entry.time_seconds || 0,
            maxTimeDate: entry.date,
            isBodyweight: entry.is_bodyweight || false,
            hasWeight: !!entry.weight_kg && entry.weight_kg > 0,
            hasTime: !!entry.time_seconds && entry.time_seconds > 0,
            side: entrySide,
          });
        } else {
          // Update max weight
          if (entry.weight_kg && entry.weight_kg > existing.maxWeight) {
            existing.maxWeight = entry.weight_kg;
            existing.maxWeightReps = entry.reps || 0;
            existing.maxWeightDate = entry.date;
            existing.id = entry.id;
            existing.hasWeight = true;
          }
          // Update max time (for plank, holds, etc.)
          if (entry.time_seconds && entry.time_seconds > existing.maxTime) {
            existing.maxTime = entry.time_seconds;
            existing.maxTimeDate = entry.date;
            existing.hasTime = true;
          }
          // Update max reps for bodyweight exercises
          if (entry.is_bodyweight && entry.reps && entry.reps > existing.maxReps) {
            existing.maxReps = entry.reps;
            existing.maxRepsDate = entry.date;
            existing.isBodyweight = true;
          }
        }
      }

      // Convert to PRs - prioritize weight PRs, then time PRs, then reps PRs
      for (const [key, data] of exerciseMap) {
        // Extract display name (remove __left or __right suffix for display)
        const displayName = data.side === 'left' || data.side === 'right'
          ? `${data.exerciseName} (${data.side === 'left' ? 'L' : 'R'})`
          : data.exerciseName;
        
        if (data.hasWeight && data.maxWeight > 0) {
          prs.push({
            id: `${key}-weight`,
            exerciseName: displayName,
            exerciseId: data.exerciseId,
            bestValue: data.maxWeight,
            bestDisplay: `${data.maxWeight} kg`,
            unit: 'kg',
            metricType: 'weight',
            achievedAt: data.maxWeightDate,
            isBodyweight: false,
            side: data.side,
          });
        } else if (data.hasTime && data.maxTime > 0) {
          // Format time as mm:ss
          const minutes = Math.floor(data.maxTime / 60);
          const seconds = data.maxTime % 60;
          prs.push({
            id: `${key}-time`,
            exerciseName: displayName,
            exerciseId: data.exerciseId,
            bestValue: data.maxTime,
            bestDisplay: minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}s`,
            unit: 's',
            metricType: 'time',
            achievedAt: data.maxTimeDate,
            isBodyweight: false,
            side: data.side,
          });
        } else if (data.isBodyweight && data.maxReps > 0) {
          prs.push({
            id: `${key}-reps`,
            exerciseName: displayName,
            exerciseId: data.exerciseId,
            bestValue: data.maxReps,
            bestDisplay: `${data.maxReps} reps`,
            unit: 'reps',
            metricType: 'reps',
            achievedAt: data.maxRepsDate,
            isBodyweight: true,
            side: data.side,
          });
        }
      }

      // Sort by most recent first
      return prs.sort((a, b) => 
        new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime()
      );
    },
    enabled: !!clientId,
  });
}
