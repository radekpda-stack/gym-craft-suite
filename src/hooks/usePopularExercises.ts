import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PopularExercise {
  id: string;
  name: string;
  name_cs: string | null;
  category: string;
  exercise_type_v2: string | null;
  usage_count: number;
}

export function usePopularExercises(limit: number = 8) {
  return useQuery({
    queryKey: ['popular-exercises', limit],
    queryFn: async (): Promise<PopularExercise[]> => {
      // Get most used exercises from exercise_entries
      const { data, error } = await supabase
        .from('exercise_entries')
        .select(`
          exercise_id,
          exercises!inner(
            id,
            name,
            name_cs,
            category,
            exercise_type_v2,
            is_archived
          )
        `)
        .not('exercise_id', 'is', null)
        .limit(1000);

      if (error) throw error;

      // Count usage per exercise
      const usageMap = new Map<string, { exercise: any; count: number }>();
      
      data?.forEach((entry: any) => {
        const exercise = entry.exercises;
        if (exercise && !exercise.is_archived) {
          const existing = usageMap.get(exercise.id);
          if (existing) {
            existing.count++;
          } else {
            usageMap.set(exercise.id, { exercise, count: 1 });
          }
        }
      });

      // Sort by count and return top exercises
      const sorted = Array.from(usageMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
        .map(({ exercise, count }) => ({
          id: exercise.id,
          name: exercise.name,
          name_cs: exercise.name_cs,
          category: exercise.category,
          exercise_type_v2: exercise.exercise_type_v2,
          usage_count: count,
        }));

      return sorted;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Filter popular exercises by type (strength vs cardio)
export function usePopularStrengthExercises(limit: number = 8) {
  const { data, ...rest } = usePopularExercises(limit + 4); // fetch a few extra to filter
  
  const strengthExercises = data?.filter(
    (ex) => ex.exercise_type_v2 === 'strength' || ex.exercise_type_v2 === 'mixed'
  ).slice(0, limit) || [];
  
  return { data: strengthExercises, ...rest };
}
