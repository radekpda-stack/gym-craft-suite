import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BodyPartCategory {
  id: string;
  key: 'upper' | 'lower' | 'core';
  name_cs: string;
  name_en: string;
  display_order: number;
}

export interface MuscleGroupToBodyPart {
  id: string;
  muscle_group_id: string;
  body_part_category_id: string;
  muscle_group?: {
    id: string;
    name: string;
    name_cz: string;
    region: string;
  };
  body_part_category?: BodyPartCategory;
}

export interface ExerciseBodyPartCategory {
  exercise_id: string;
  body_part_category_id: string;
  body_part_key: string;
  body_part_name_cs: string;
  body_part_name_en: string;
  display_order: number;
}

// Fetch high-level body part categories
export function useBodyPartCategories() {
  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ['body-part-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('body_part_categories')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      return data as BodyPartCategory[];
    },
    staleTime: 1000 * 60 * 60, // 1 hour - reference data rarely changes
  });

  return { categories, isLoading, error };
}

// Fetch mapping from muscle groups to body part categories
export function useMuscleGroupToBodyPart() {
  const { data: mappings = [], isLoading, error } = useQuery({
    queryKey: ['muscle-group-to-body-part'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('muscle_group_to_body_part')
        .select(`
          *,
          muscle_group:muscle_groups(id, name, name_cz, region),
          body_part_category:body_part_categories(id, key, name_cs, name_en, display_order)
        `);
      
      if (error) throw error;
      return data as MuscleGroupToBodyPart[];
    },
    staleTime: 1000 * 60 * 60,
  });

  // Create lookup map: muscle_group_id -> body_part_category
  const muscleToBodyPartMap = new Map<string, BodyPartCategory>();
  mappings.forEach(m => {
    if (m.body_part_category) {
      muscleToBodyPartMap.set(m.muscle_group_id, m.body_part_category as BodyPartCategory);
    }
  });

  return { mappings, muscleToBodyPartMap, isLoading, error };
}

// Fetch derived body part categories for exercises (using the view)
export function useExerciseBodyPartCategories(exerciseIds?: string[]) {
  const { data: exerciseCategories = [], isLoading, error } = useQuery({
    queryKey: ['exercise-body-part-categories', exerciseIds?.join(',')],
    queryFn: async () => {
      let query = supabase
        .from('exercise_body_part_categories')
        .select('*');
      
      if (exerciseIds && exerciseIds.length > 0) {
        query = query.in('exercise_id', exerciseIds);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as ExerciseBodyPartCategory[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Create lookup map: exercise_id -> body_part_category keys
  const exerciseBodyPartMap = new Map<string, Set<string>>();
  exerciseCategories.forEach(ec => {
    if (!exerciseBodyPartMap.has(ec.exercise_id)) {
      exerciseBodyPartMap.set(ec.exercise_id, new Set());
    }
    exerciseBodyPartMap.get(ec.exercise_id)!.add(ec.body_part_key);
  });

  // Helper function to get body parts for an exercise
  const getExerciseBodyParts = (exerciseId: string): string[] => {
    return Array.from(exerciseBodyPartMap.get(exerciseId) || []);
  };

  // Helper function to check if exercise matches filter
  const exerciseMatchesFilter = (exerciseId: string, filterKeys: string[]): boolean => {
    if (filterKeys.length === 0) return true;
    const exerciseKeys = exerciseBodyPartMap.get(exerciseId);
    if (!exerciseKeys) return false;
    return filterKeys.some(key => exerciseKeys.has(key));
  };

  return { 
    exerciseCategories, 
    exerciseBodyPartMap, 
    getExerciseBodyParts,
    exerciseMatchesFilter,
    isLoading, 
    error 
  };
}

// Get exercises without any muscle groups assigned (for admin report)
export function useExercisesWithoutMuscleGroups() {
  const { data: exercises = [], isLoading, error } = useQuery({
    queryKey: ['exercises-without-muscle-groups'],
    queryFn: async () => {
      // Get all active exercises
      const { data: allExercises, error: exError } = await supabase
        .from('exercises')
        .select('id, name, name_cs, category')
        .eq('is_archived', false);
      
      if (exError) throw exError;

      // Get all exercise_muscle_groups
      const { data: muscleGroups, error: mgError } = await supabase
        .from('exercise_muscle_groups')
        .select('exercise_id');
      
      if (mgError) throw mgError;

      const exercisesWithMuscleGroups = new Set(muscleGroups?.map(mg => mg.exercise_id) || []);
      
      // Filter exercises without muscle groups
      return (allExercises || [])
        .filter(ex => !exercisesWithMuscleGroups.has(ex.id))
        .map(ex => ({
          id: ex.id,
          name: ex.name_cs || ex.name,
          category: ex.category,
        }));
    },
    staleTime: 1000 * 60 * 5,
  });

  return { exercises, isLoading, error };
}

// Get top used exercises without muscle groups (based on workout_entries)
export function useTopUsedExercisesWithoutMuscleGroups(limit = 20) {
  const { data: exercises = [], isLoading, error } = useQuery({
    queryKey: ['top-used-exercises-without-muscle-groups', limit],
    queryFn: async () => {
      // Get all exercise_muscle_groups
      const { data: muscleGroups, error: mgError } = await supabase
        .from('exercise_muscle_groups')
        .select('exercise_id');
      
      if (mgError) throw mgError;

      const exercisesWithMuscleGroups = new Set(muscleGroups?.map(mg => mg.exercise_id) || []);

      // Get workout entries with exercise_id, grouped by exercise
      const { data: entries, error: entryError } = await supabase
        .from('workout_entries')
        .select('exercise_id, exercise_name')
        .not('exercise_id', 'is', null);
      
      if (entryError) throw entryError;

      // Count usage by exercise_id
      const usageCounts = new Map<string, { id: string; name: string; count: number }>();
      
      entries?.forEach(e => {
        if (!e.exercise_id || exercisesWithMuscleGroups.has(e.exercise_id)) return;
        
        if (!usageCounts.has(e.exercise_id)) {
          usageCounts.set(e.exercise_id, {
            id: e.exercise_id,
            name: e.exercise_name,
            count: 0,
          });
        }
        usageCounts.get(e.exercise_id)!.count++;
      });

      // Sort by count and return top N
      return Array.from(usageCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    },
    staleTime: 1000 * 60 * 5,
  });

  return { exercises, isLoading, error };
}

// Get body part category labels
export const BODY_PART_LABELS: Record<string, string> = {
  upper: 'Horní část',
  lower: 'Dolní část',
  core: 'Core',
};

export const BODY_PART_COLORS: Record<string, string> = {
  upper: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  lower: 'bg-green-500/20 text-green-700 dark:text-green-300',
  core: 'bg-orange-500/20 text-orange-700 dark:text-orange-300',
};
