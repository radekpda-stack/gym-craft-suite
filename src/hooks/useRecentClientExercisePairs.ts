import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface RecentClientExercisePair {
  client_id: string;
  client_name: string;
  exercise_id: string;
  exercise_name: string;
  last_date: string;
}

export function useRecentClientExercisePairs(limit = 5) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recent-client-exercise-pairs', user?.id, limit],
    queryFn: async (): Promise<RecentClientExercisePair[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('exercise_entries')
        .select('client_id, exercise_id, exercise_name, date, clients!inner(name)')
        .eq('user_id', user.id)
        .not('exercise_id', 'is', null)
        .order('date', { ascending: false })
        .limit(100);

      if (error) throw error;

      const seen = new Set<string>();
      const pairs: RecentClientExercisePair[] = [];

      for (const entry of data || []) {
        const key = `${entry.client_id}__${entry.exercise_id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const clientData = entry.clients as unknown as { name: string };
        pairs.push({
          client_id: entry.client_id,
          client_name: clientData?.name || '?',
          exercise_id: entry.exercise_id!,
          exercise_name: entry.exercise_name,
          last_date: entry.date,
        });

        if (pairs.length >= limit) break;
      }

      return pairs;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
