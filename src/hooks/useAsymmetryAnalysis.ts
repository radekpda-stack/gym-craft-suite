import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type Side = 'left' | 'right' | 'both' | 'none';

export interface AsymmetryResult {
  exerciseName: string;
  exerciseId: string | null;
  leftBest: number | null;
  rightBest: number | null;
  asymmetryPercent: number;
  dominantSide: 'left' | 'right' | 'equal';
  unit: string;
  metricType: 'weight' | 'time' | 'reps' | 'distance' | 'height';
  leftDate: string | null;
  rightDate: string | null;
}

/**
 * Analyzes asymmetry between left and right sides for unilateral exercises.
 * Returns exercises with both L and R data and their difference percentage.
 */
export function useAsymmetryAnalysis(clientId: string | null | undefined) {
  return useQuery({
    queryKey: ['asymmetry-analysis', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      // Get all exercise entries with side = 'left' or 'right' from trainer sessions
      const { data: trainerEntries, error: trainerError } = await supabase
        .from('exercise_entries')
        .select('id, exercise_name, exercise_id, weight_kg, reps, time_seconds, distance_meters, height_cm, date, side')
        .eq('client_id', clientId)
        .in('side', ['left', 'right'])
        .order('date', { ascending: false });

      if (trainerError) throw trainerError;

      // Get all client workout exercises with side = 'left' or 'right'
      const { data: clientExercises, error: clientError } = await supabase
        .from('client_workout_exercises')
        .select('id, exercise_name, exercise_id, weight_kg, reps, duration_seconds, distance_meters, side, client_workout_logs!inner(date, client_id)')
        .eq('client_workout_logs.client_id', clientId)
        .in('side', ['left', 'right']);

      if (clientError) throw clientError;

      // Merge both sources into a unified format
      const entries = [
        ...(trainerEntries || []),
        ...(clientExercises || []).map((ex: any) => ({
          id: ex.id,
          exercise_name: ex.exercise_name,
          exercise_id: ex.exercise_id,
          weight_kg: ex.weight_kg,
          reps: ex.reps,
          time_seconds: ex.duration_seconds,
          distance_meters: ex.distance_meters,
          height_cm: null,
          date: ex.client_workout_logs?.date,
          side: ex.side,
        })),
      ];

      // Group by exercise name and side
      const exerciseMap = new Map<string, {
        exerciseId: string | null;
        left: { value: number; date: string; unit: string; metricType: AsymmetryResult['metricType'] } | null;
        right: { value: number; date: string; unit: string; metricType: AsymmetryResult['metricType'] } | null;
      }>();

      for (const entry of entries || []) {
        const key = entry.exercise_name;
        const side = entry.side as Side;
        
        if (side !== 'left' && side !== 'right') continue;

        // Determine metric type and value
        let value: number | null = null;
        let unit = '';
        let metricType: AsymmetryResult['metricType'] = 'weight';
        
        if (entry.height_cm && entry.height_cm > 0) {
          value = entry.height_cm;
          unit = 'cm';
          metricType = 'height';
        } else if (entry.distance_meters && entry.distance_meters > 0) {
          value = entry.distance_meters * 100; // Convert to cm for display
          unit = 'cm';
          metricType = 'distance';
        } else if (entry.weight_kg && entry.weight_kg > 0) {
          value = entry.weight_kg;
          unit = 'kg';
          metricType = 'weight';
        } else if (entry.time_seconds && entry.time_seconds > 0) {
          value = entry.time_seconds;
          unit = 's';
          metricType = 'time';
        } else if (entry.reps && entry.reps > 0) {
          value = entry.reps;
          unit = '×';
          metricType = 'reps';
        }

        if (value === null) continue;

        const existing = exerciseMap.get(key);
        const newEntry = { value, date: entry.date, unit, metricType };

        if (!existing) {
          exerciseMap.set(key, {
            exerciseId: entry.exercise_id,
            left: side === 'left' ? newEntry : null,
            right: side === 'right' ? newEntry : null,
          });
        } else {
          // Update if this is a better value (higher for most metrics, lower for time)
          const isBetter = (current: typeof newEntry, best: typeof newEntry | null) => {
            if (!best) return true;
            if (metricType === 'time') {
              return current.value < best.value;
            }
            return current.value > best.value;
          };

          if (side === 'left' && isBetter(newEntry, existing.left)) {
            existing.left = newEntry;
          } else if (side === 'right' && isBetter(newEntry, existing.right)) {
            existing.right = newEntry;
          }
        }
      }

      // Calculate asymmetry for exercises with both sides
      const results: AsymmetryResult[] = [];

      for (const [exerciseName, data] of exerciseMap) {
        if (!data.left || !data.right) continue;

        const leftVal = data.left.value;
        const rightVal = data.right.value;
        const max = Math.max(leftVal, rightVal);
        const min = Math.min(leftVal, rightVal);
        
        // For time-based: lower is better, so dominant is the lower one
        const isTimeBased = data.left.metricType === 'time';
        let dominantSide: 'left' | 'right' | 'equal' = 'equal';
        
        if (leftVal !== rightVal) {
          if (isTimeBased) {
            dominantSide = leftVal < rightVal ? 'left' : 'right';
          } else {
            dominantSide = leftVal > rightVal ? 'left' : 'right';
          }
        }

        const asymmetryPercent = max > 0 ? Math.round(((max - min) / max) * 100) : 0;

        results.push({
          exerciseName,
          exerciseId: data.exerciseId,
          leftBest: leftVal,
          rightBest: rightVal,
          asymmetryPercent,
          dominantSide,
          unit: data.left.unit,
          metricType: data.left.metricType,
          leftDate: data.left.date,
          rightDate: data.right.date,
        });
      }

      // Sort by asymmetry percentage (highest first)
      return results.sort((a, b) => b.asymmetryPercent - a.asymmetryPercent);
    },
    enabled: !!clientId,
  });
}

/**
 * Get severity color class based on asymmetry percentage
 */
export function getAsymmetrySeverityColor(percent: number): string {
  if (percent < 10) return 'text-green-600 bg-green-500/10';
  if (percent < 20) return 'text-yellow-600 bg-yellow-500/10';
  return 'text-red-600 bg-red-500/10';
}

/**
 * Get severity label based on asymmetry percentage
 */
export function getAsymmetrySeverityLabel(percent: number): string {
  if (percent < 10) return 'Nízká';
  if (percent < 20) return 'Střední';
  return 'Vysoká';
}
