import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortal } from '@/contexts/ClientPortalContext';

export interface ExerciseLeaderboardEntry {
  rank: number;
  nickname: string;
  client_id: string;
  best_value: number;
  display_value: string;
  achieved_at: string;
  is_anonymous: boolean;
  is_current_client?: boolean;
}

export interface ExerciseForLeaderboard {
  exercise_name: string;
  exercise_id: string | null;
  entry_count: number;
  exercise_type: 'strength' | 'cardio';
}

export type GenderFilter = 'all' | 'male' | 'female';
export type AgeFilter = 'all' | '20-30' | '30-40' | '40-50' | '50+';

// Fetch all exercises for comparison via edge function
export function useExercisesForComparison(trainerId: string | undefined) {
  const { clientId } = useClientPortal();

  return useQuery({
    queryKey: ['exercises-for-comparison', trainerId, clientId],
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
        console.error('[useExercisesForComparison] Error:', error);
        throw error;
      }

      return {
        strength: (data?.strength || []) as ExerciseForLeaderboard[],
        cardio: (data?.cardio || []) as ExerciseForLeaderboard[],
      };
    },
    enabled: !!trainerId && !!clientId,
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch leaderboard for a specific strength exercise (by max weight)
export function useStrengthExerciseLeaderboard(
  exerciseName: string | null,
  trainerId: string | undefined,
  genderFilter: GenderFilter = 'all',
  ageFilter: AgeFilter = 'all',
  side?: 'left' | 'right' | null
) {
  const { clientId } = useClientPortal();

  return useQuery({
    queryKey: ['strength-exercise-leaderboard', exerciseName, trainerId, genderFilter, ageFilter, side, clientId],
    queryFn: async () => {
      if (!exerciseName || !trainerId || !clientId) return null;

      const { data, error } = await supabase.functions.invoke('client-portal-benchmarks', {
        body: {
          action: 'get_exercise_leaderboard',
          trainerId,
          clientId,
          exerciseName,
          exerciseType: 'strength',
          genderFilter,
          ageFilter,
          side,
        },
      });

      if (error) {
        console.error('[useStrengthExerciseLeaderboard] Error:', error);
        throw error;
      }

      if (!data || !data.leaderboard?.length) return null;

      return {
        leaderboard: data.leaderboard as ExerciseLeaderboardEntry[],
        total_participants: data.total_participants as number,
        client_rank: data.client_rank as number | null,
        client_percentile: data.client_percentile as number | null,
        exercise_name: data.exercise_name as string,
        metric: data.metric as string,
        unit: data.unit as string,
        gender_filter: data.gender_filter as GenderFilter,
        age_filter: ageFilter,
      };
    },
    enabled: !!exerciseName && !!trainerId && !!clientId,
    staleTime: 2 * 60 * 1000,
  });
}

// Fetch leaderboard for a specific cardio exercise (by distance or time)
export function useCardioExerciseLeaderboard(
  exerciseName: string | null,
  trainerId: string | undefined,
  metric: 'distance' | 'duration' = 'distance',
  genderFilter: GenderFilter = 'all',
  ageFilter: AgeFilter = 'all'
) {
  const { clientId } = useClientPortal();

  return useQuery({
    queryKey: ['cardio-exercise-leaderboard', exerciseName, trainerId, metric, genderFilter, ageFilter, clientId],
    queryFn: async () => {
      if (!exerciseName || !trainerId || !clientId) return null;

      const { data, error } = await supabase.functions.invoke('client-portal-benchmarks', {
        body: {
          action: 'get_exercise_leaderboard',
          trainerId,
          clientId,
          exerciseName,
          exerciseType: 'cardio',
          cardioMetric: metric,
          genderFilter,
          ageFilter,
        },
      });

      if (error) {
        console.error('[useCardioExerciseLeaderboard] Error:', error);
        throw error;
      }

      if (!data || !data.leaderboard?.length) return null;

      return {
        leaderboard: data.leaderboard as ExerciseLeaderboardEntry[],
        total_participants: data.total_participants as number,
        client_rank: data.client_rank as number | null,
        client_percentile: data.client_percentile as number | null,
        exercise_name: data.exercise_name as string,
        metric: data.metric as string,
        unit: data.unit as string,
        gender_filter: data.gender_filter as GenderFilter,
        age_filter: ageFilter,
      };
    },
    enabled: !!exerciseName && !!trainerId && !!clientId,
    staleTime: 2 * 60 * 1000,
  });
}
