import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface RecentExercise {
  exercise_id: string;
  exercise_name: string;
  last_used: string;
}

export function useRecentExercises(limit: number = 10) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recent-exercises', user?.id, limit],
    queryFn: async (): Promise<RecentExercise[]> => {
      if (!user?.id) return [];

      // Get the most recently used exercises
      const { data, error } = await supabase
        .from('exercise_entries')
        .select('exercise_id, exercise_name, date')
        .eq('user_id', user.id)
        .not('exercise_id', 'is', null)
        .order('date', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Deduplicate by exercise_id and keep the most recent
      const exerciseMap = new Map<string, RecentExercise>();
      
      data?.forEach(entry => {
        if (entry.exercise_id && !exerciseMap.has(entry.exercise_id)) {
          exerciseMap.set(entry.exercise_id, {
            exercise_id: entry.exercise_id,
            exercise_name: entry.exercise_name,
            last_used: entry.date,
          });
        }
      });

      return Array.from(exerciseMap.values()).slice(0, limit);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
