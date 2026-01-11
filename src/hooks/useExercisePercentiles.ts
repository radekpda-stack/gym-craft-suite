import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortal } from '@/contexts/ClientPortalContext';

export interface ExerciseWithPercentile {
  exercise_name: string;
  exercise_id: string | null;
  entry_count: number;
  exercise_type: 'strength' | 'cardio';
  client_percentile: number | null;
  client_best_value: number | null;
  metric_type?: 'weight' | 'time' | 'distance' | 'height';
}

// Fetch exercises with client's percentile for each via edge function
export function useExercisesWithPercentiles(trainerId: string | undefined) {
  const { clientId } = useClientPortal();

  return useQuery({
    queryKey: ['exercises-with-percentiles', trainerId, clientId],
    queryFn: async () => {
      if (!trainerId || !clientId) return { strength: [], cardio: [] };

      const { data, error } = await supabase.functions.invoke('client-portal-benchmarks', {
        body: {
          action: 'get_available_exercises',
          trainerId,
          clientId,
        },
      });

      if (error) {
        console.error('[useExercisesWithPercentiles] Error:', error);
        throw error;
      }

      return {
        strength: (data?.strength || []) as ExerciseWithPercentile[],
        cardio: (data?.cardio || []) as ExerciseWithPercentile[],
      };
    },
    enabled: !!trainerId && !!clientId,
    staleTime: 5 * 60 * 1000,
  });
}
