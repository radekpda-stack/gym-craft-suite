import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SuspiciousExercise {
  id: string;
  name: string;
  category: string;
  bodyParts: string[];
  muscleCount: number;
  reason: 'multi_category' | 'too_many_muscles';
}

export interface OverTaggedExercise {
  id: string;
  name: string;
  muscleCount: number;
  muscles: string[];
}

export interface UnderTaggedExercise {
  id: string;
  name: string;
  muscleCount: number;
  usageCount: number;
}

/**
 * Hook for fetching suspicious cardio exercises
 */
export function useSuspiciousCardioExercises() {
  return useQuery({
    queryKey: ['suspicious-cardio-exercises'],
    queryFn: async () => {
      // Get cardio exercises
      const { data: cardioExercises, error: exError } = await supabase
        .from('exercises')
        .select('id, name, name_cs, category')
        .eq('category', 'Kardio')
        .eq('is_archived', false);

      if (exError) throw exError;

      // Get their muscle groups and body parts
      const suspicious: SuspiciousExercise[] = [];

      for (const ex of cardioExercises || []) {
        // Get muscle groups
        const { data: muscles } = await supabase
          .from('exercise_muscle_groups')
          .select(`
            muscle_group:muscle_groups(id, name_cz)
          `)
          .eq('exercise_id', ex.id);

        // Get body parts from view
        const { data: bodyParts } = await supabase
          .from('exercise_body_part_categories')
          .select('body_part_key')
          .eq('exercise_id', ex.id);

        const bodyPartKeys = bodyParts?.map(bp => bp.body_part_key) || [];
        const muscleCount = muscles?.length || 0;

        // Check for suspicious patterns
        const hasAllThreeCategories = 
          bodyPartKeys.includes('upper') && 
          bodyPartKeys.includes('lower') && 
          bodyPartKeys.includes('core');

        const hasTooManyMuscles = muscleCount > 5;

        if (hasAllThreeCategories || hasTooManyMuscles) {
          suspicious.push({
            id: ex.id,
            name: ex.name_cs || ex.name,
            category: ex.category,
            bodyParts: bodyPartKeys,
            muscleCount,
            reason: hasAllThreeCategories ? 'multi_category' : 'too_many_muscles',
          });
        }
      }

      return suspicious;
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook for fetching over-tagged exercises (>7 muscle groups)
 */
export function useOverTaggedExercises() {
  return useQuery({
    queryKey: ['over-tagged-exercises'],
    queryFn: async () => {
      const { data: exercises, error } = await supabase
        .from('exercises')
        .select(`
          id,
          name,
          name_cs,
          exercise_muscle_groups(
            muscle_group:muscle_groups(name_cz)
          )
        `)
        .eq('is_archived', false);

      if (error) throw error;

      const overTagged: OverTaggedExercise[] = [];

      for (const ex of exercises || []) {
        const muscleGroups = (ex.exercise_muscle_groups || []) as any[];
        if (muscleGroups.length > 7) {
          overTagged.push({
            id: ex.id,
            name: ex.name_cs || ex.name,
            muscleCount: muscleGroups.length,
            muscles: muscleGroups.map(mg => mg.muscle_group?.name_cz).filter(Boolean),
          });
        }
      }

      return overTagged.sort((a, b) => b.muscleCount - a.muscleCount);
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook for fetching under-tagged but frequently used exercises
 */
export function useUnderTaggedExercises(minUsageCount = 5) {
  return useQuery({
    queryKey: ['under-tagged-exercises', minUsageCount],
    queryFn: async () => {
      // Get exercises with only 1 muscle group
      const { data: exercises, error: exError } = await supabase
        .from('exercises')
        .select(`
          id,
          name,
          name_cs,
          exercise_muscle_groups(id)
        `)
        .eq('is_archived', false);

      if (exError) throw exError;

      const singleMuscleExercises = (exercises || []).filter(
        ex => (ex.exercise_muscle_groups || []).length === 1
      );

      if (singleMuscleExercises.length === 0) return [];

      // Get usage counts
      const { data: usageCounts, error: usageError } = await supabase
        .from('workout_entries')
        .select('exercise_id')
        .in('exercise_id', singleMuscleExercises.map(e => e.id));

      if (usageError) throw usageError;

      // Count usage per exercise
      const usageMap = new Map<string, number>();
      (usageCounts || []).forEach(entry => {
        const count = usageMap.get(entry.exercise_id) || 0;
        usageMap.set(entry.exercise_id, count + 1);
      });

      const underTagged: UnderTaggedExercise[] = singleMuscleExercises
        .filter(ex => (usageMap.get(ex.id) || 0) >= minUsageCount)
        .map(ex => ({
          id: ex.id,
          name: ex.name_cs || ex.name,
          muscleCount: 1,
          usageCount: usageMap.get(ex.id) || 0,
        }))
        .sort((a, b) => b.usageCount - a.usageCount);

      return underTagged;
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook for exercises without body part categories (derived)
 */
export function useExercisesWithoutBodyPartCategories() {
  return useQuery({
    queryKey: ['exercises-without-body-part-categories'],
    queryFn: async () => {
      // Get all exercises
      const { data: exercises, error: exError } = await supabase
        .from('exercises')
        .select('id, name, name_cs, category')
        .eq('is_archived', false);

      if (exError) throw exError;

      // Get all exercises with body part categories
      const { data: withCategories, error: catError } = await supabase
        .from('exercise_body_part_categories')
        .select('exercise_id');

      if (catError) throw catError;

      const exercisesWithCategories = new Set(
        (withCategories || []).map(e => e.exercise_id)
      );

      return (exercises || [])
        .filter(ex => !exercisesWithCategories.has(ex.id))
        .map(ex => ({
          id: ex.id,
          name: ex.name_cs || ex.name,
          category: ex.category,
        }));
    },
    staleTime: 1000 * 60 * 5,
  });
}
