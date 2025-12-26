import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subMonths, format, parseISO } from 'date-fns';

export interface MeasurementDataPoint {
  date: string;
  value: number;
}

export interface CardioDataPoint {
  date: string;
  timeSeconds: number;
  pace: string; // min:sec per km/500m
}

export interface TrackedExerciseProgress {
  exerciseName: string;
  exerciseId: string | null;
  data: {
    date: string;
    weight: number;
    reps: number;
    volume: number;
  }[];
}

export function useClientWeightProgress(clientId: string | null, months = 6) {
  return useQuery({
    queryKey: ['client-weight-progress', clientId, months],
    queryFn: async () => {
      if (!clientId) return [];
      
      const startDate = format(subMonths(new Date(), months), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('measurements')
        .select('date, weight')
        .eq('client_id', clientId)
        .gte('date', startDate)
        .not('weight', 'is', null)
        .order('date', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(m => ({
        date: m.date,
        value: m.weight as number,
      })) as MeasurementDataPoint[];
    },
    enabled: !!clientId,
  });
}

export function useClientBodyFatProgress(clientId: string | null, months = 6) {
  return useQuery({
    queryKey: ['client-bodyfat-progress', clientId, months],
    queryFn: async () => {
      if (!clientId) return [];
      
      const startDate = format(subMonths(new Date(), months), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('measurements')
        .select('date, body_fat_percentage')
        .eq('client_id', clientId)
        .gte('date', startDate)
        .not('body_fat_percentage', 'is', null)
        .order('date', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(m => ({
        date: m.date,
        value: m.body_fat_percentage as number,
      })) as MeasurementDataPoint[];
    },
    enabled: !!clientId,
  });
}

export function useClientCardioProgress(
  clientId: string | null,
  exerciseName: string,
  distanceMeters: number,
  months = 6
) {
  return useQuery({
    queryKey: ['client-cardio-progress', clientId, exerciseName, distanceMeters, months],
    queryFn: async () => {
      if (!clientId) return [];
      
      const startDate = format(subMonths(new Date(), months), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('cardio_entries')
        .select('date, duration_seconds, distance_meters, is_pr')
        .eq('client_id', clientId)
        .eq('exercise_name', exerciseName)
        .eq('distance_meters', distanceMeters)
        .gte('date', startDate)
        .order('date', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(entry => {
        const totalSeconds = entry.duration_seconds;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        return {
          date: entry.date,
          timeSeconds: totalSeconds,
          pace: `${minutes}:${seconds.toString().padStart(2, '0')}`,
        };
      }) as CardioDataPoint[];
    },
    enabled: !!clientId,
  });
}

export function useClientTrackedExercises(clientId: string | null) {
  return useQuery({
    queryKey: ['client-tracked-exercises', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      // First get the tracked exercises for this client
      const { data: tracked, error: trackedError } = await supabase
        .from('client_tracked_exercises')
        .select('id, exercise_name, exercise_id, display_order')
        .eq('client_id', clientId)
        .order('display_order', { ascending: true });
      
      if (trackedError) throw trackedError;
      if (!tracked || tracked.length === 0) return [];
      
      // Get exercise entries for each tracked exercise
      const results: TrackedExerciseProgress[] = [];
      const startDate = format(subMonths(new Date(), 6), 'yyyy-MM-dd');
      
      for (const exercise of tracked) {
        const { data: entries, error: entriesError } = await supabase
          .from('exercise_entries')
          .select('date, weight_kg, reps, sets')
          .eq('client_id', clientId)
          .eq('exercise_name', exercise.exercise_name)
          .gte('date', startDate)
          .not('weight_kg', 'is', null)
          .order('date', { ascending: true });
        
        if (entriesError) continue;
        
        if (entries && entries.length > 0) {
          results.push({
            exerciseName: exercise.exercise_name,
            exerciseId: exercise.exercise_id,
            data: entries.map(e => ({
              date: e.date,
              weight: e.weight_kg || 0,
              reps: e.reps || 0,
              volume: (e.weight_kg || 0) * (e.reps || 0) * (e.sets || 1),
            })),
          });
        }
      }
      
      return results;
    },
    enabled: !!clientId,
  });
}

// Hook to get visibility settings for client portal (from trainer)
export function useClientPortalProgressSettings(trainerId: string | null) {
  return useQuery({
    queryKey: ['portal-progress-settings-for-client', trainerId],
    queryFn: async () => {
      if (!trainerId) return null;
      
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('user_id', trainerId)
        .eq('key', 'portal_visibility')
        .maybeSingle();
      
      if (error) throw error;
      return data?.value as {
        progress: boolean;
        progressMetrics?: {
          weight: boolean;
          bodyFat: boolean;
          trackedExercises: boolean;
          rowing500m: boolean;
          rowing1000m: boolean;
          running500m: boolean;
          running1000m: boolean;
        };
      } | null;
    },
    enabled: !!trainerId,
  });
}
