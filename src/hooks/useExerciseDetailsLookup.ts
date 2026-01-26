/**
 * Hook for looking up exercise details (descriptions, instructions, etc.)
 * Used by client portal to show exercise information
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ExerciseLookupData {
  id: string;
  name: string;
  name_cs: string | null;
  description_cs: string | null;
  instructions_cs: string | null;
  equipment: string[] | null;
  muscle_groups: string[] | null;
  is_unilateral: boolean;
}

/**
 * Fetches exercise details for a list of exercise names
 * Returns a map from exercise_name -> exercise details
 */
export function useExerciseDetailsLookup(exerciseNames: string[]) {
  return useQuery({
    queryKey: ['exercise-details-lookup', exerciseNames.sort().join(',')],
    enabled: exerciseNames.length > 0,
    staleTime: 1000 * 60 * 30, // 30 minutes - exercise data rarely changes
    queryFn: async (): Promise<Map<string, ExerciseLookupData>> => {
      if (exerciseNames.length === 0) return new Map();

      // Fetch exercises by name (case-insensitive match)
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name, name_cs, description_cs, instructions_cs, equipment, muscle_groups, is_unilateral')
        .or(exerciseNames.map(n => `name.ilike.${n}`).join(','))
        .eq('is_archived', false);

      if (error) throw error;

      const lookup = new Map<string, ExerciseLookupData>();
      
      (data || []).forEach(ex => {
        // Map by both name and name_cs for flexible lookup
        lookup.set(ex.name.toLowerCase(), ex);
        if (ex.name_cs) {
          lookup.set(ex.name_cs.toLowerCase(), ex);
        }
      });

      return lookup;
    },
  });
}

/**
 * Simplified hook that fetches all exercises with descriptions
 * Useful when we need to lookup exercises without knowing names upfront
 */
export function useAllExerciseDetails() {
  return useQuery({
    queryKey: ['all-exercise-details'],
    staleTime: 1000 * 60 * 30, // 30 minutes
    queryFn: async (): Promise<Map<string, ExerciseLookupData>> => {
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name, name_cs, description_cs, instructions_cs, equipment, muscle_groups, is_unilateral')
        .eq('is_archived', false);

      if (error) throw error;

      const lookup = new Map<string, ExerciseLookupData>();
      
      (data || []).forEach(ex => {
        lookup.set(ex.name.toLowerCase(), ex);
        if (ex.name_cs) {
          lookup.set(ex.name_cs.toLowerCase(), ex);
        }
      });

      return lookup;
    },
  });
}
