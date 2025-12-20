import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInHours } from 'date-fns';

export interface PendingFeedbackTraining {
  id: string;
  client_id: string;
  client_name: string;
  date: string;
  hours_since_training: number;
  feedback_request_id?: string;
  feedback_status?: 'not_created' | 'created_not_sent' | 'sent_pending' | 'completed';
}

export function usePendingFeedbackTrainings() {
  return useQuery({
    queryKey: ['pending-feedback-trainings'],
    queryFn: async () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      // Get completed trainings from last 3 days
      const { data: trainings, error: trainingsError } = await supabase
        .from('training_sessions')
        .select(`
          id,
          client_id,
          date,
          clients!inner (
            id,
            name,
            feedback_enabled
          )
        `)
        .eq('status', 'completed')
        .gte('date', threeDaysAgo.toISOString())
        .order('date', { ascending: false });

      if (trainingsError) throw trainingsError;

      // Filter to clients with feedback enabled
      const enabledTrainings = (trainings || []).filter(
        (t: any) => t.clients?.feedback_enabled !== false
      );

      if (enabledTrainings.length === 0) return [];

      // Get existing feedback requests for these trainings
      const { data: requests } = await supabase
        .from('feedback_requests')
        .select('id, training_session_id, status, sent_at')
        .in('training_session_id', enabledTrainings.map((t: any) => t.id));

      const requestMap = new Map(
        (requests || []).map(r => [r.training_session_id, r])
      );

      // Build result
      const result: PendingFeedbackTraining[] = enabledTrainings.map((t: any) => {
        const request = requestMap.get(t.id);
        const hoursSince = differenceInHours(now, new Date(t.date));

        let feedback_status: PendingFeedbackTraining['feedback_status'] = 'not_created';
        if (request) {
          if (request.status === 'completed') {
            feedback_status = 'completed';
          } else if (request.sent_at) {
            feedback_status = 'sent_pending';
          } else {
            feedback_status = 'created_not_sent';
          }
        }

        return {
          id: t.id,
          client_id: t.client_id,
          client_name: t.clients?.name || 'Neznámý',
          date: t.date,
          hours_since_training: hoursSince,
          feedback_request_id: request?.id,
          feedback_status,
        };
      });

      // Filter out completed ones - we only want pending
      return result.filter(r => r.feedback_status !== 'completed');
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
