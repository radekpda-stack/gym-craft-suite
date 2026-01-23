/**
 * Unified hook that combines exercise entries from all tables:
 * - exercise_entries (strength/plyometric)
 * - cardio_entries
 * - skill_entries
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ExerciseEntryType = 'strength' | 'cardio' | 'skill';

export interface UnifiedExerciseEntry {
  id: string;
  user_id: string;
  client_id: string;
  exercise_id: string | null;
  exercise_name: string;
  date: string;
  entry_type: ExerciseEntryType;
  // Strength fields
  sets?: number | null;
  reps?: number | null;
  weight_kg?: number | null;
  is_bodyweight?: boolean;
  tempo?: string | null;
  // Cardio fields
  duration_seconds?: number | null;
  distance_meters?: number | null;
  avg_speed_kmh?: number | null;
  avg_heart_rate?: number | null;
  // Skill fields
  attempts?: number | null;
  successful?: number | null;
  technique_rating?: string | null;
  is_breakthrough?: boolean;
  // Common
  time_seconds?: number | null;
  notes?: string | null;
  is_pr?: boolean;
  rpe?: number | null;
  created_at: string;
  updated_at: string;
  clients?: {
    id: string;
    name: string;
  } | null;
}

export function useAllExerciseEntries(clientId?: string) {
  return useQuery({
    queryKey: ['all-exercise-entries', clientId],
    queryFn: async () => {
      const results: UnifiedExerciseEntry[] = [];

      // 1. Fetch strength/exercise entries
      let strengthQuery = supabase
        .from('exercise_entries')
        .select('*, clients(id, name)')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (clientId) {
        strengthQuery = strengthQuery.eq('client_id', clientId);
      }
      
      const { data: strengthData, error: strengthError } = await strengthQuery.limit(300);
      if (strengthError) throw strengthError;
      
      // Map strength entries
      for (const entry of strengthData || []) {
        results.push({
          id: entry.id,
          user_id: entry.user_id,
          client_id: entry.client_id,
          exercise_id: entry.exercise_id,
          exercise_name: entry.exercise_name,
          date: entry.date,
          entry_type: 'strength',
          sets: entry.sets,
          reps: entry.reps,
          weight_kg: entry.weight_kg,
          is_bodyweight: entry.is_bodyweight,
          tempo: entry.tempo,
          time_seconds: entry.time_seconds,
          notes: entry.notes,
          is_pr: entry.is_pr,
          rpe: entry.rpe,
          distance_meters: entry.distance_meters,
          created_at: entry.created_at,
          updated_at: entry.updated_at,
          clients: entry.clients,
        });
      }

      // 2. Fetch cardio entries
      let cardioQuery = supabase
        .from('cardio_entries')
        .select('*, clients(id, name)')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (clientId) {
        cardioQuery = cardioQuery.eq('client_id', clientId);
      }
      
      const { data: cardioData, error: cardioError } = await cardioQuery.limit(300);
      if (cardioError) throw cardioError;
      
      // Map cardio entries
      for (const entry of cardioData || []) {
        results.push({
          id: entry.id,
          user_id: entry.user_id,
          client_id: entry.client_id,
          exercise_id: entry.exercise_id,
          exercise_name: entry.exercise_name,
          date: entry.date,
          entry_type: 'cardio',
          duration_seconds: entry.duration_seconds,
          distance_meters: entry.distance_meters,
          avg_speed_kmh: entry.avg_speed_kmh,
          avg_heart_rate: entry.avg_heart_rate,
          time_seconds: entry.duration_seconds, // Map for compatibility
          notes: entry.notes,
          is_pr: entry.is_pr,
          rpe: entry.rpe,
          created_at: entry.created_at,
          updated_at: entry.updated_at,
          clients: entry.clients,
        });
      }

      // 3. Fetch skill entries
      let skillQuery = supabase
        .from('skill_entries')
        .select('*, clients(id, name)')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (clientId) {
        skillQuery = skillQuery.eq('client_id', clientId);
      }
      
      const { data: skillData, error: skillError } = await skillQuery.limit(300);
      if (skillError) throw skillError;
      
      // Map skill entries
      for (const entry of skillData || []) {
        results.push({
          id: entry.id,
          user_id: entry.user_id,
          client_id: entry.client_id,
          exercise_id: entry.exercise_id,
          exercise_name: entry.exercise_name,
          date: entry.date,
          entry_type: 'skill',
          attempts: entry.attempts,
          successful: entry.successful,
          technique_rating: entry.technique_rating,
          is_breakthrough: entry.is_breakthrough,
          duration_seconds: entry.duration_seconds,
          time_seconds: entry.duration_seconds,
          notes: entry.notes,
          is_pr: entry.is_breakthrough, // Use breakthrough as PR equivalent
          rpe: entry.rpe,
          created_at: entry.created_at,
          updated_at: entry.updated_at,
          clients: entry.clients,
        });
      }

      // Sort all by date descending
      results.sort((a, b) => {
        const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      return results;
    },
  });
}
