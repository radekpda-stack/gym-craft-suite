import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RxWorkoutResult } from './useRxWorkoutResults';

/**
 * Fetch all attempts by a specific client for a specific workout
 */
export function useRxClientHistory(workoutId: string | null, clientId: string | null) {
  return useQuery({
    queryKey: ['rx-client-history', workoutId, clientId],
    queryFn: async (): Promise<RxWorkoutResult[]> => {
      if (!workoutId || !clientId) return [];
      
      const { data, error } = await supabase
        .from('rx_workout_results')
        .select(`
          *,
          client:clients(id, name, gender)
        `)
        .eq('rx_workout_id', workoutId)
        .eq('client_id', clientId)
        .order('performed_at', { ascending: true });
      
      if (error) throw error;
      return (data || []) as RxWorkoutResult[];
    },
    enabled: !!workoutId && !!clientId,
  });
}

/**
 * Get progression stats for a client on a workout
 */
export function useRxClientProgression(workoutId: string | null, clientId: string | null) {
  const { data: history = [], isLoading } = useRxClientHistory(workoutId, clientId);
  
  if (history.length === 0) {
    return {
      history: [],
      isLoading,
      stats: null,
    };
  }

  // Calculate progression stats
  const completedAttempts = history.filter(r => !r.is_capped);
  const prAttempt = history.find(r => r.is_personal_record);
  
  const firstScore = completedAttempts[0]?.score_primary;
  const bestScore = completedAttempts.reduce((best, r) => {
    if (best === null) return r.score_primary;
    // Assuming lower is better for time-based, higher for others
    // This should be determined by scoring_mode, but we don't have it here
    return r.score_primary < best ? r.score_primary : best;
  }, null as number | null);
  
  const latestScore = completedAttempts[completedAttempts.length - 1]?.score_primary;
  
  const stats = {
    totalAttempts: history.length,
    completedAttempts: completedAttempts.length,
    cappedAttempts: history.filter(r => r.is_capped).length,
    firstScore,
    bestScore,
    latestScore,
    prDate: prAttempt?.performed_at,
    improvement: firstScore && bestScore ? Math.abs(firstScore - bestScore) : null,
  };

  return {
    history,
    isLoading,
    stats,
  };
}
