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
  heightCm: number | null;
  rpe: number | null;
  avgHeartRate: number | null;
  avgWatts: number | null;
}

export type ExerciseEntryType = 'strength' | 'cardio' | 'skill';

export interface ClientExerciseProgress {
  exerciseName: string;
  count: number;
  lastDate: string;
  maxWeight: number | null;
  bestTime: number | null;
  bestHeight: number | null;
  bestDistance: number | null;
  avgRpe: number | null;
  prCount: number;
  data: ExerciseProgressEntry[];
  isTimeBased: boolean;
  exerciseType: ExerciseEntryType;
}

export function useClientAllExercises(clientId: string | null, months = 6) {
  return useQuery({
    queryKey: ['client-all-exercises', clientId, months],
    queryFn: async () => {
      if (!clientId) return [];
      
      const startDate = format(subMonths(new Date(), months), 'yyyy-MM-dd');
      
      // 1. Fetch exercise_entries (strength)
      const { data: strengthEntries, error: strengthError } = await supabase
        .from('exercise_entries')
        .select('exercise_name, date, weight_kg, reps, sets, is_pr, time_seconds, distance_meters, rpe, avg_heart_rate, avg_watts')
        .eq('client_id', clientId)
        .gte('date', startDate)
        .order('date', { ascending: true });
      
      if (strengthError) throw strengthError;

      // 2. Fetch cardio_entries
      const { data: cardioEntries, error: cardioError } = await supabase
        .from('cardio_entries')
        .select('exercise_name, date, duration_seconds, distance_meters, is_pr, rpe, avg_heart_rate, avg_watts')
        .eq('client_id', clientId)
        .gte('date', startDate)
        .order('date', { ascending: true });
      
      if (cardioError) throw cardioError;

      // 3. Fetch skill_entries (plyo/skill)
      const { data: skillEntries, error: skillError } = await supabase
        .from('skill_entries')
        .select('exercise_name, date, duration_seconds, attempts, successful, is_breakthrough, rpe')
        .eq('client_id', clientId)
        .gte('date', startDate)
        .order('date', { ascending: true });
      
      if (skillError) throw skillError;
      
      // Group by exercise_name with type
      const grouped: Record<string, { entries: ExerciseProgressEntry[]; type: ExerciseEntryType }> = {};
      const exerciseStats: Record<string, { 
        maxWeight: number | null; 
        bestTime: number | null;
        bestHeight: number | null;
        bestDistance: number | null;
        rpeSum: number;
        rpeCount: number;
        prCount: number; 
        lastDate: string;
        isTimeBased: boolean;
        exerciseType: ExerciseEntryType;
      }> = {};

      // Process strength entries
      for (const entry of strengthEntries || []) {
        const name = entry.exercise_name;
        const weight = entry.weight_kg;
        const reps = entry.reps || 0;
        const sets = entry.sets || 1;
        const timeSeconds = entry.time_seconds;
        const distanceMeters = entry.distance_meters;
        const isTimeBased = timeSeconds !== null && timeSeconds > 0;
        
        if (!grouped[name]) {
          grouped[name] = { entries: [], type: 'strength' };
          exerciseStats[name] = { 
            maxWeight: null, 
            bestTime: null, 
            bestHeight: null,
            bestDistance: null,
            rpeSum: 0,
            rpeCount: 0,
            prCount: 0, 
            lastDate: entry.date,
            isTimeBased,
            exerciseType: 'strength'
          };
        }
        
        grouped[name].entries.push({
          date: entry.date,
          weight,
          reps,
          sets,
          volume: (weight || 0) * reps * sets,
          isPR: entry.is_pr || false,
          timeSeconds,
          distanceMeters,
          heightCm: null,
          rpe: (entry as any).rpe ?? null,
          avgHeartRate: (entry as any).avg_heart_rate ?? null,
          avgWatts: (entry as any).avg_watts ?? null,
        });
        
        // Update stats
        if (isTimeBased) {
          if (exerciseStats[name].bestTime === null || (timeSeconds && timeSeconds < exerciseStats[name].bestTime!)) {
            exerciseStats[name].bestTime = timeSeconds;
          }
          exerciseStats[name].isTimeBased = true;
        } else {
          if (weight && (exerciseStats[name].maxWeight === null || weight > exerciseStats[name].maxWeight!)) {
            exerciseStats[name].maxWeight = weight;
          }
        }
        if (distanceMeters && (exerciseStats[name].bestDistance === null || distanceMeters > exerciseStats[name].bestDistance!)) {
          exerciseStats[name].bestDistance = distanceMeters;
        }
        if ((entry as any).rpe) {
          exerciseStats[name].rpeSum += (entry as any).rpe;
          exerciseStats[name].rpeCount++;
        }
        
        if (entry.is_pr) exerciseStats[name].prCount++;
        if (entry.date > exerciseStats[name].lastDate) exerciseStats[name].lastDate = entry.date;
      }

      // Process cardio entries
      for (const entry of cardioEntries || []) {
        const name = entry.exercise_name;
        const timeSeconds = entry.duration_seconds;
        const distanceMeters = entry.distance_meters;
        
        if (!grouped[name]) {
          grouped[name] = { entries: [], type: 'cardio' };
          exerciseStats[name] = { 
            maxWeight: null, 
            bestTime: null, 
            bestHeight: null,
            bestDistance: null,
            rpeSum: 0,
            rpeCount: 0,
            prCount: 0, 
            lastDate: entry.date,
            isTimeBased: true,
            exerciseType: 'cardio'
          };
        }
        
        grouped[name].entries.push({
          date: entry.date,
          weight: null,
          reps: 0,
          sets: 1,
          volume: 0,
          isPR: entry.is_pr || false,
          timeSeconds,
          distanceMeters,
          heightCm: null,
          rpe: (entry as any).rpe ?? null,
          avgHeartRate: (entry as any).avg_heart_rate ?? null,
          avgWatts: (entry as any).avg_watts ?? null,
        });
        
        // For cardio: track best time (shortest = best for fixed distance)
        if (timeSeconds && (exerciseStats[name].bestTime === null || timeSeconds < exerciseStats[name].bestTime!)) {
          exerciseStats[name].bestTime = timeSeconds;
        }
        if (distanceMeters && (exerciseStats[name].bestDistance === null || distanceMeters > exerciseStats[name].bestDistance!)) {
          exerciseStats[name].bestDistance = distanceMeters;
        }
        if ((entry as any).rpe) {
          exerciseStats[name].rpeSum += (entry as any).rpe;
          exerciseStats[name].rpeCount++;
        }
        exerciseStats[name].isTimeBased = true;
        exerciseStats[name].exerciseType = 'cardio';
        
        if (entry.is_pr) exerciseStats[name].prCount++;
        if (entry.date > exerciseStats[name].lastDate) exerciseStats[name].lastDate = entry.date;
      }

      // Process skill/plyo entries
      for (const entry of skillEntries || []) {
        const name = entry.exercise_name;
        const durationSeconds = entry.duration_seconds;
        const attempts = entry.attempts || 1;
        
        if (!grouped[name]) {
          grouped[name] = { entries: [], type: 'skill' };
          exerciseStats[name] = { 
            maxWeight: null, 
            bestTime: null, 
            bestHeight: null,
            bestDistance: null,
            rpeSum: 0,
            rpeCount: 0,
            prCount: 0, 
            lastDate: entry.date,
            isTimeBased: !!durationSeconds,
            exerciseType: 'skill'
          };
        }
        
        grouped[name].entries.push({
          date: entry.date,
          weight: null,
          reps: attempts,
          sets: 1,
          volume: 0,
          isPR: entry.is_breakthrough || false,
          timeSeconds: durationSeconds,
          distanceMeters: null,
          heightCm: null,
          rpe: (entry as any).rpe ?? null,
          avgHeartRate: null,
          avgWatts: null,
        });
        
        if (durationSeconds && (exerciseStats[name].bestTime === null || durationSeconds < exerciseStats[name].bestTime!)) {
          exerciseStats[name].bestTime = durationSeconds;
        }
        if ((entry as any).rpe) {
          exerciseStats[name].rpeSum += (entry as any).rpe;
          exerciseStats[name].rpeCount++;
        }
        exerciseStats[name].exerciseType = 'skill';
        
        if (entry.is_breakthrough) exerciseStats[name].prCount++;
        if (entry.date > exerciseStats[name].lastDate) exerciseStats[name].lastDate = entry.date;
      }
      
      // Convert to array and sort by lastDate (most recent first)
      const result: ClientExerciseProgress[] = Object.entries(grouped)
        .map(([name, data]) => ({
          exerciseName: name,
          count: data.entries.length,
          lastDate: exerciseStats[name].lastDate,
          maxWeight: exerciseStats[name].maxWeight,
          bestTime: exerciseStats[name].bestTime,
          bestHeight: exerciseStats[name].bestHeight,
          bestDistance: exerciseStats[name].bestDistance,
          avgRpe: exerciseStats[name].rpeCount > 0
            ? Math.round(exerciseStats[name].rpeSum / exerciseStats[name].rpeCount * 10) / 10
            : null,
          prCount: exerciseStats[name].prCount,
          data: data.entries,
          isTimeBased: exerciseStats[name].isTimeBased,
          exerciseType: exerciseStats[name].exerciseType,
        }))
        .sort((a, b) => b.lastDate.localeCompare(a.lastDate));
      
      return result;
    },
    enabled: !!clientId,
  });
}
