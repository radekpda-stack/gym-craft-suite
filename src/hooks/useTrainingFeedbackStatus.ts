import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type FeedbackStatus = 'none' | 'pending_send' | 'sent_waiting' | 'completed';

export interface TrainingFeedbackStatus {
  training_id: string;
  status: FeedbackStatus;
}

/**
 * Hook to get feedback status for multiple training sessions
 */
export function useTrainingFeedbackStatuses(trainingIds: string[]) {
  return useQuery({
    queryKey: ['training-feedback-statuses', trainingIds],
    queryFn: async () => {
      if (trainingIds.length === 0) return new Map<string, FeedbackStatus>();

      const { data: requests } = await supabase
        .from('feedback_requests')
        .select('training_session_id, status, sent_at')
        .in('training_session_id', trainingIds);

      const statusMap = new Map<string, FeedbackStatus>();

      // Initialize all as 'none'
      trainingIds.forEach(id => statusMap.set(id, 'none'));

      // Update based on feedback requests
      (requests || []).forEach(req => {
        if (!req.training_session_id) return;
        
        if (req.status === 'completed') {
          statusMap.set(req.training_session_id, 'completed');
        } else if (req.sent_at) {
          statusMap.set(req.training_session_id, 'sent_waiting');
        } else {
          statusMap.set(req.training_session_id, 'pending_send');
        }
      });

      return statusMap;
    },
    enabled: trainingIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to get feedback status for a single training session
 */
export function useTrainingFeedbackStatus(trainingId: string | undefined) {
  return useQuery({
    queryKey: ['training-feedback-status', trainingId],
    queryFn: async () => {
      if (!trainingId) return 'none' as FeedbackStatus;

      const { data: request } = await supabase
        .from('feedback_requests')
        .select('status, sent_at')
        .eq('training_session_id', trainingId)
        .maybeSingle();

      if (!request) return 'none' as FeedbackStatus;
      if (request.status === 'completed') return 'completed' as FeedbackStatus;
      if (request.sent_at) return 'sent_waiting' as FeedbackStatus;
      return 'pending_send' as FeedbackStatus;
    },
    enabled: !!trainingId,
    staleTime: 1000 * 60 * 5,
  });
}
