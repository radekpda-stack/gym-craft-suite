import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatTimeWithCentiseconds } from '@/lib/timeUtils';

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

// Alias for backwards compatibility
const formatTime = formatTimeWithCentiseconds;

/**
 * Fetches personal records from exercise_entries for a client.
 * Aggregates best weight/time/reps per exercise.
 * For time-based exercises (cardio), shows LOWEST time as PR.
 * For holds/planks, shows HIGHEST time as PR.
 */
export function useClientExercisePRs(clientId: string | null | undefined) {
  return useQuery({
    queryKey: ['client-exercise-prs', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const prs: ExercisePR[] = [];

      // Get all exercise entries for this client with exercise metadata
      const { data: entries, error } = await supabase
        .from('exercise_entries')
        .select(`
          id, exercise_name, exercise_id, weight_kg, reps, 
          is_bodyweight, date, time_seconds, side, 
          distance_meters, height_cm,
          exercises!exercise_id (
            is_time_based,
            category
          )
        `)
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
        // For holds/planks - higher is better
        maxTime: number;
        maxTimeDate: string;
        // For cardio (time-based) - lower is better
        minTime: number;
        minTimeDate: string;
        maxDistance: number;
        maxDistanceDate: string;
        maxHeight: number;
        maxHeightDate: string;
        isBodyweight: boolean;
        hasWeight: boolean;
        hasTime: boolean;
        hasDistance: boolean;
        hasHeight: boolean;
        side: 'left' | 'right' | 'both' | 'none' | null;
        isTimeBased: boolean;
        category: string | null;
      }>();

      for (const entry of entries || []) {
        // Get exercise metadata
        const exerciseData = entry.exercises as { is_time_based: boolean; category: string } | null;
        const isTimeBased = exerciseData?.is_time_based ?? false;
        const category = exerciseData?.category ?? null;
        
        // Normalize exercise name (case-insensitive grouping)
        const normalizedName = entry.exercise_name.toLowerCase().trim();
        
        // Group by normalized exercise name + side for unilateral exercises
        const entrySide = (entry.side as 'left' | 'right' | 'both' | 'none') || 'none';
        const key = entrySide === 'left' || entrySide === 'right' 
          ? `${normalizedName}__${entrySide}` 
          : normalizedName;
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
            minTime: entry.time_seconds || Infinity,
            minTimeDate: entry.date,
            maxDistance: entry.distance_meters || 0,
            maxDistanceDate: entry.date,
            maxHeight: entry.height_cm || 0,
            maxHeightDate: entry.date,
            isBodyweight: entry.is_bodyweight || false,
            hasWeight: !!entry.weight_kg && entry.weight_kg > 0,
            hasTime: !!entry.time_seconds && entry.time_seconds > 0,
            hasDistance: !!entry.distance_meters && entry.distance_meters > 0,
            hasHeight: !!entry.height_cm && entry.height_cm > 0,
            side: entrySide,
            isTimeBased,
            category,
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
          
          // Update time tracking
          if (entry.time_seconds && entry.time_seconds > 0) {
            existing.hasTime = true;
            
            // For time-based exercises (cardio), track LOWEST time
            if (entry.time_seconds < existing.minTime) {
              existing.minTime = entry.time_seconds;
              existing.minTimeDate = entry.date;
            }
            
            // For holds/planks, track HIGHEST time
            if (entry.time_seconds > existing.maxTime) {
              existing.maxTime = entry.time_seconds;
              existing.maxTimeDate = entry.date;
            }
          }
          
          // Update max distance (for jumps, throws, etc.)
          if (entry.distance_meters && entry.distance_meters > existing.maxDistance) {
            existing.maxDistance = entry.distance_meters;
            existing.maxDistanceDate = entry.date;
            existing.hasDistance = true;
          }
          // Update max height (for vertical jumps, etc.)
          if (entry.height_cm && entry.height_cm > existing.maxHeight) {
            existing.maxHeight = entry.height_cm;
            existing.maxHeightDate = entry.date;
            existing.hasHeight = true;
          }
          // Update max reps for bodyweight exercises
          if (entry.is_bodyweight && entry.reps && entry.reps > existing.maxReps) {
            existing.maxReps = entry.reps;
            existing.maxRepsDate = entry.date;
            existing.isBodyweight = true;
          }
        }
      }

      // Convert to PRs with correct priority based on exercise type
      for (const [key, data] of exerciseMap) {
        // Extract display name (remove __left or __right suffix for display)
        const displayName = data.side === 'left' || data.side === 'right'
          ? `${data.exerciseName} (${data.side === 'left' ? 'L' : 'R'})`
          : data.exerciseName;
        
        // Detect if this is likely a cardio/time-based exercise
        // Either from database flag or by category, or by having time + distance combo
        const isCardioExercise = data.isTimeBased || 
          data.category === 'cardio' ||
          (data.hasTime && data.hasDistance);
        
        // Detect if this is a jump/throw exercise (distance without time priority)
        const isJumpOrThrow = data.hasDistance && !data.hasTime && !data.hasWeight;
        
        // Detect if this is a hold/plank exercise
        const isHoldExercise = data.hasTime && !data.hasDistance && !data.hasWeight && !data.isTimeBased;

        // TIME-BASED CARDIO: Show fastest time (lowest) as PR
        if (isCardioExercise && data.hasTime && data.minTime > 0 && data.minTime !== Infinity) {
          const displayValue = data.hasDistance 
            ? `${formatTime(data.minTime)} / ${Math.round(data.maxDistance)}m`
            : formatTime(data.minTime);
          
          prs.push({
            id: `${key}-time`,
            exerciseName: displayName,
            exerciseId: data.exerciseId,
            bestValue: data.minTime,
            bestDisplay: displayValue,
            unit: 's',
            metricType: 'time',
            achievedAt: data.minTimeDate,
            isBodyweight: false,
            side: data.side,
          });
        }
        // JUMP/THROW: Show distance as PR
        else if (isJumpOrThrow && data.maxDistance > 0) {
          const distanceCm = Math.round(data.maxDistance * 100);
          const displayValue = distanceCm >= 100 
            ? `${(data.maxDistance).toFixed(2)} m` 
            : `${distanceCm} cm`;
          prs.push({
            id: `${key}-distance`,
            exerciseName: displayName,
            exerciseId: data.exerciseId,
            bestValue: data.maxDistance,
            bestDisplay: displayValue,
            unit: 'cm',
            metricType: 'distance',
            achievedAt: data.maxDistanceDate,
            isBodyweight: false,
            side: data.side,
          });
        }
        // HEIGHT: Vertical jumps
        else if (data.hasHeight && data.maxHeight > 0) {
          prs.push({
            id: `${key}-height`,
            exerciseName: displayName,
            exerciseId: data.exerciseId,
            bestValue: data.maxHeight,
            bestDisplay: `${data.maxHeight} cm`,
            unit: 'cm',
            metricType: 'distance',
            achievedAt: data.maxHeightDate,
            isBodyweight: false,
            side: data.side,
          });
        }
        // WEIGHT: Strength exercises
        else if (data.hasWeight && data.maxWeight > 0) {
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
        }
        // HOLD/PLANK: Show longest time (highest) as PR
        else if (isHoldExercise && data.maxTime > 0) {
          prs.push({
            id: `${key}-time`,
            exerciseName: displayName,
            exerciseId: data.exerciseId,
            bestValue: data.maxTime,
            bestDisplay: formatTime(data.maxTime),
            unit: 's',
            metricType: 'time',
            achievedAt: data.maxTimeDate,
            isBodyweight: false,
            side: data.side,
          });
        }
        // BODYWEIGHT REPS
        else if (data.isBodyweight && data.maxReps > 0) {
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
        // FALLBACK: Show time if available (max time)
        else if (data.hasTime && data.maxTime > 0) {
          prs.push({
            id: `${key}-time`,
            exerciseName: displayName,
            exerciseId: data.exerciseId,
            bestValue: data.maxTime,
            bestDisplay: formatTime(data.maxTime),
            unit: 's',
            metricType: 'time',
            achievedAt: data.maxTimeDate,
            isBodyweight: false,
            side: data.side,
          });
        }
        // FALLBACK: Show distance if available
        else if (data.hasDistance && data.maxDistance > 0) {
          const distanceCm = Math.round(data.maxDistance * 100);
          const displayValue = distanceCm >= 100 
            ? `${(data.maxDistance).toFixed(2)} m` 
            : `${distanceCm} cm`;
          prs.push({
            id: `${key}-distance`,
            exerciseName: displayName,
            exerciseId: data.exerciseId,
            bestValue: data.maxDistance,
            bestDisplay: displayValue,
            unit: 'cm',
            metricType: 'distance',
            achievedAt: data.maxDistanceDate,
            isBodyweight: false,
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
