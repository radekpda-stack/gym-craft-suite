import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FeedbackRequest {
  id: string;
  token: string;
  status: string;
  expires_at: string;
  sent_at: string | null;
  opened_at: string | null;
  reminder_count: number;
  completed_at: string | null;
}

export function useFeedbackRequest(trainingId: string | undefined) {
  return useQuery({
    queryKey: ['feedback-request', trainingId],
    queryFn: async (): Promise<FeedbackRequest | null> => {
      if (!trainingId) return null;

      const { data, error } = await supabase
        .from('feedback_requests')
        .select('id, token, status, expires_at, sent_at, opened_at, reminder_count, completed_at')
        .eq('training_session_id', trainingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching feedback request:', error);
        throw error;
      }

      return data;
    },
    enabled: !!trainingId,
  });
}

// Hook to get pending feedback count for dashboard
export function usePendingFeedbackCount() {
  return useQuery({
    queryKey: ['pending-feedback-count'],
    queryFn: async () => {
      // Get trainings from last 2 days that don't have feedback
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      // First, get completed trainings in the last 2 days
      const { data: trainings, error: trainingsError } = await supabase
        .from('training_sessions')
        .select(`
          id,
          client_id,
          clients!inner(feedback_enabled)
        `)
        .eq('status', 'completed')
        .gte('date', twoDaysAgo.toISOString())
        .lt('date', new Date().toISOString());

      if (trainingsError) throw trainingsError;

      // Filter trainings where client has feedback enabled
      const eligibleTrainings = trainings?.filter(
        (t: any) => t.clients?.feedback_enabled !== false
      ) || [];

      // Get feedback requests for these trainings
      const trainingIds = eligibleTrainings.map((t: any) => t.id);
      
      if (trainingIds.length === 0) return 0;

      const { data: feedbackRequests } = await supabase
        .from('feedback_requests')
        .select('training_session_id, status')
        .in('training_session_id', trainingIds)
        .eq('status', 'completed');

      const completedFeedbackIds = new Set(
        feedbackRequests?.map((f: any) => f.training_session_id) || []
      );

      // Count trainings without completed feedback
      return eligibleTrainings.filter(
        (t: any) => !completedFeedbackIds.has(t.id)
      ).length;
    },
  });
}

// Hook to get red flag feedbacks
export function useRedFlagFeedbacks(days: number = 7) {
  return useQuery({
    queryKey: ['red-flag-feedbacks', days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from('training_feedback')
        .select(`
          *,
          clients(name),
          training_sessions(date)
        `)
        .eq('is_red_flag', true)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}
