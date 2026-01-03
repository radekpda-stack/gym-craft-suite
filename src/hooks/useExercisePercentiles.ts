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
}

// Fetch exercises with client's percentile for each
export function useExercisesWithPercentiles(trainerId: string | undefined) {
  const { clientId } = useClientPortal();

  return useQuery({
    queryKey: ['exercises-with-percentiles', trainerId, clientId],
    queryFn: async () => {
      if (!trainerId || !clientId) return { strength: [], cardio: [] };

      // Get all strength entries
      const { data: strengthData } = await supabase
        .from('exercise_entries')
        .select('exercise_name, exercise_id, client_id, weight_kg')
        .eq('user_id', trainerId)
        .not('weight_kg', 'is', null);

      // Get all cardio entries
      const { data: cardioData } = await supabase
        .from('cardio_entries')
        .select('exercise_name, exercise_id, client_id, distance_meters')
        .eq('user_id', trainerId);

      // Process strength exercises
      const strengthByExercise = new Map<string, Map<string, number>>();
      (strengthData || []).forEach((e: { exercise_name: string; exercise_id: string | null; client_id: string; weight_kg: number | null }) => {
        const key = e.exercise_name.toLowerCase().trim();
        if (!strengthByExercise.has(key)) {
          strengthByExercise.set(key, new Map());
        }
        const clientMap = strengthByExercise.get(key)!;
        const current = clientMap.get(e.client_id) || 0;
        if (e.weight_kg && e.weight_kg > current) {
          clientMap.set(e.client_id, e.weight_kg);
        }
      });

      // Calculate percentiles for strength
      const strengthResults: ExerciseWithPercentile[] = [];
      strengthByExercise.forEach((clientBests, exerciseName) => {
        const values = Array.from(clientBests.values()).sort((a, b) => a - b);
        const clientBest = clientBests.get(clientId);
        
        let percentile: number | null = null;
        if (clientBest !== undefined && values.length > 0) {
          const belowCount = values.filter(v => v < clientBest).length;
          percentile = (belowCount / values.length) * 100;
        }

        strengthResults.push({
          exercise_name: exerciseName,
          exercise_id: null,
          entry_count: values.length,
          exercise_type: 'strength',
          client_percentile: percentile,
          client_best_value: clientBest ?? null,
        });
      });

      // Process cardio exercises (distance based)
      const cardioByExercise = new Map<string, Map<string, number>>();
      (cardioData || []).forEach((e: { exercise_name: string; exercise_id: string | null; client_id: string; distance_meters: number | null }) => {
        const key = e.exercise_name.toLowerCase().trim();
        if (!cardioByExercise.has(key)) {
          cardioByExercise.set(key, new Map());
        }
        const clientMap = cardioByExercise.get(key)!;
        const current = clientMap.get(e.client_id) || 0;
        if (e.distance_meters && e.distance_meters > current) {
          clientMap.set(e.client_id, e.distance_meters);
        }
      });

      // Calculate percentiles for cardio
      const cardioResults: ExerciseWithPercentile[] = [];
      cardioByExercise.forEach((clientBests, exerciseName) => {
        const values = Array.from(clientBests.values()).sort((a, b) => a - b);
        const clientBest = clientBests.get(clientId);
        
        let percentile: number | null = null;
        if (clientBest !== undefined && values.length > 0) {
          const belowCount = values.filter(v => v < clientBest).length;
          percentile = (belowCount / values.length) * 100;
        }

        cardioResults.push({
          exercise_name: exerciseName,
          exercise_id: null,
          entry_count: values.length,
          exercise_type: 'cardio',
          client_percentile: percentile,
          client_best_value: clientBest ?? null,
        });
      });

      // Sort by entry count and filter to exercises with client data
      return {
        strength: strengthResults
          .filter(e => e.entry_count >= 1)
          .sort((a, b) => b.entry_count - a.entry_count),
        cardio: cardioResults
          .filter(e => e.entry_count >= 1)
          .sort((a, b) => b.entry_count - a.entry_count),
      };
    },
    enabled: !!trainerId && !!clientId,
    staleTime: 5 * 60 * 1000,
  });
}
