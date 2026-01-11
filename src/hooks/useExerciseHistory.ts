import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ExerciseHistoryEntry {
  id: string;
  date: string;
  weight_kg: number | null;
  reps: number | null;
  time_seconds: number | null;
  distance_meters: number | null;
  height_cm: number | null;
  is_bodyweight: boolean;
  side: 'left' | 'right' | 'both' | 'none' | null;
  notes: string | null;
  // Formatted display value
  displayValue: string;
  // Primary metric type for this entry
  metricType: 'weight' | 'time' | 'reps' | 'distance';
}

/**
 * Format seconds to mm:ss or just seconds
 */
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return minutes > 0 ? `${minutes}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
}

/**
 * Fetches exercise history for a specific exercise and client.
 * Shows all entries for that exercise, ordered by date descending.
 */
export function useExerciseHistory(
  clientId: string | null | undefined,
  exerciseName: string | null | undefined,
  exerciseId: string | null | undefined,
  side: 'left' | 'right' | 'both' | 'none' | null = null
) {
  return useQuery({
    queryKey: ['exercise-history', clientId, exerciseName, exerciseId, side],
    queryFn: async () => {
      if (!clientId || !exerciseName) return [];

      // Build query - use exercise_id if available, otherwise fall back to name
      let query = supabase
        .from('exercise_entries')
        .select(`
          id, exercise_name, exercise_id, weight_kg, reps, 
          is_bodyweight, date, time_seconds, side, 
          distance_meters, height_cm, notes,
          exercises!exercise_id (
            is_time_based,
            category
          )
        `)
        .eq('client_id', clientId)
        .order('date', { ascending: false });

      // Filter by exercise
      if (exerciseId) {
        query = query.eq('exercise_id', exerciseId);
      } else {
        query = query.eq('exercise_name', exerciseName);
      }

      // Filter by side if specified (for unilateral exercises)
      if (side === 'left' || side === 'right') {
        query = query.eq('side', side);
      }

      const { data: entries, error } = await query;

      if (error) throw error;

      // Map to history entries
      const history: ExerciseHistoryEntry[] = (entries || []).map(entry => {
        const exerciseData = entry.exercises as { is_time_based: boolean; category: string } | null;
        const isTimeBased = exerciseData?.is_time_based ?? false;
        const category = exerciseData?.category ?? null;
        const isCardio = isTimeBased || category === 'cardio';
        
        // Determine display value and metric type based on what data is available
        let displayValue = '';
        let metricType: ExerciseHistoryEntry['metricType'] = 'weight';
        
        // Priority: weight > time > distance > reps
        if (entry.weight_kg && entry.weight_kg > 0) {
          displayValue = `${entry.weight_kg} kg`;
          if (entry.reps && entry.reps > 0) {
            displayValue += ` × ${entry.reps}`;
          }
          metricType = 'weight';
        } else if (entry.time_seconds && entry.time_seconds > 0) {
          displayValue = formatTime(entry.time_seconds);
          if (entry.distance_meters && entry.distance_meters > 0) {
            displayValue += ` / ${Math.round(entry.distance_meters)}m`;
          }
          metricType = 'time';
        } else if (entry.distance_meters && entry.distance_meters > 0) {
          const distanceCm = Math.round(entry.distance_meters * 100);
          displayValue = distanceCm >= 100 
            ? `${entry.distance_meters.toFixed(2)} m` 
            : `${distanceCm} cm`;
          metricType = 'distance';
        } else if (entry.height_cm && entry.height_cm > 0) {
          displayValue = `${entry.height_cm} cm`;
          metricType = 'distance';
        } else if (entry.reps && entry.reps > 0) {
          displayValue = `${entry.reps} opakování`;
          metricType = 'reps';
        } else {
          displayValue = '—';
        }
        
        return {
          id: entry.id,
          date: entry.date,
          weight_kg: entry.weight_kg,
          reps: entry.reps,
          time_seconds: entry.time_seconds,
          distance_meters: entry.distance_meters,
          height_cm: entry.height_cm,
          is_bodyweight: entry.is_bodyweight || false,
          side: (entry.side as ExerciseHistoryEntry['side']) || null,
          notes: entry.notes,
          displayValue,
          metricType,
        };
      });

      return history;
    },
    enabled: !!clientId && !!exerciseName,
  });
}
