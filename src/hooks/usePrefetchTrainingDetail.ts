import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook for prefetching training detail data on hover/touch
 * Reduces perceived load time when opening training cards
 */
export function usePrefetchTrainingDetail() {
  const queryClient = useQueryClient();

  const prefetchTraining = useCallback(async (trainingId: string, clientId?: string) => {
    if (!trainingId) return;

    // Check if already cached
    const existingData = queryClient.getQueryData(['training_session', trainingId]);
    if (existingData) return;

    // Prefetch training session - this is the critical path
    queryClient.prefetchQuery({
      queryKey: ['training_session', trainingId],
      staleTime: 1000 * 60 * 1,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('training_sessions')
          .select('id, client_id, date, duration, notes, subjective_rating, status, canceled_at, is_late_cancellation, cancellation_reason, participant_count, recurrence_type, recurrence_end_date, parent_session_id, created_at, updated_at, user_id, payment_status, final_price, payment_method, training_type, training_goal, rpe, rir, total_volume, intensity_notes, subjective_difficulty, trainer_went_well, trainer_problems, trainer_recommendations, prep_notes, pain_reported, pain_notes, client_rpe, training_load')
          .eq('id', trainingId)
          .single();

        if (error) throw error;
        return data;
      },
    });

    // Prefetch related data in parallel (lower priority)
    if (clientId) {
      // Client data
      queryClient.prefetchQuery({
        queryKey: ['client', clientId],
        staleTime: 1000 * 60 * 5,
        queryFn: async () => {
          const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .single();

          if (error) throw error;
          return data;
        },
      });
    }

    // Training tags
    queryClient.prefetchQuery({
      queryKey: ['training-session-tags', trainingId],
      staleTime: 1000 * 60 * 2,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('training_session_tags')
          .select('*')
          .eq('training_session_id', trainingId);

        if (error) throw error;
        return data || [];
      },
    });

    // Training participants
    queryClient.prefetchQuery({
      queryKey: ['training-participants', trainingId],
      staleTime: 1000 * 60 * 2,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('training_participants')
          .select(`
            id,
            training_session_id,
            client_id,
            payment_method,
            created_at,
            clients (id, name)
          `)
          .eq('training_session_id', trainingId);

        if (error) throw error;
        return data || [];
      },
    });

    // Training feedback
    queryClient.prefetchQuery({
      queryKey: ['training-feedback', trainingId],
      staleTime: 1000 * 60 * 2,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('training_feedback')
          .select('*')
          .eq('training_session_id', trainingId)
          .maybeSingle();

        if (error) throw error;
        return data;
      },
    });
  }, [queryClient]);

  return { prefetchTraining };
}
