import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { cs } from 'date-fns/locale';

interface FeedbackSummary {
  lastFeedbackDate: string | null;
  lastFeedbackFormatted: string | null;
  trend: 'up' | 'same' | 'down' | null;
  averageBodyFeel: number | null;
  totalCount: number;
}

export function useClientFeedbackSummary(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-feedback-summary', clientId],
    queryFn: async (): Promise<FeedbackSummary> => {
      if (!clientId) {
        return {
          lastFeedbackDate: null,
          lastFeedbackFormatted: null,
          trend: null,
          averageBodyFeel: null,
          totalCount: 0,
        };
      }

      // Get feedback for this client through feedback_requests
      const { data: requests } = await supabase
        .from('feedback_requests')
        .select('id, completed_at')
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(10);

      if (!requests || requests.length === 0) {
        return {
          lastFeedbackDate: null,
          lastFeedbackFormatted: null,
          trend: null,
          averageBodyFeel: null,
          totalCount: 0,
        };
      }

      // Get feedback details
      const { data: feedbacks } = await supabase
        .from('training_feedback')
        .select('body_feel, created_at, feedback_request_id')
        .in('feedback_request_id', requests.map(r => r.id))
        .order('created_at', { ascending: false });

      if (!feedbacks || feedbacks.length === 0) {
        return {
          lastFeedbackDate: requests[0].completed_at,
          lastFeedbackFormatted: requests[0].completed_at 
            ? format(new Date(requests[0].completed_at), 'd.M.yyyy', { locale: cs })
            : null,
          trend: null,
          averageBodyFeel: null,
          totalCount: requests.length,
        };
      }

      const lastFeedback = feedbacks[0];
      const bodyFeelValues = feedbacks
        .filter(f => f.body_feel !== null)
        .map(f => f.body_feel as number);

      // Calculate trend: compare last 3 vs previous 3
      let trend: 'up' | 'same' | 'down' | null = null;
      if (bodyFeelValues.length >= 6) {
        const recent = bodyFeelValues.slice(0, 3);
        const previous = bodyFeelValues.slice(3, 6);
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
        
        if (recentAvg > previousAvg + 0.5) trend = 'up';
        else if (recentAvg < previousAvg - 0.5) trend = 'down';
        else trend = 'same';
      }

      const averageBodyFeel = bodyFeelValues.length > 0
        ? Math.round(bodyFeelValues.reduce((a, b) => a + b, 0) / bodyFeelValues.length * 10) / 10
        : null;

      return {
        lastFeedbackDate: lastFeedback.created_at,
        lastFeedbackFormatted: format(new Date(lastFeedback.created_at), 'd.M.yyyy', { locale: cs }),
        trend,
        averageBodyFeel,
        totalCount: feedbacks.length,
      };
    },
    enabled: !!clientId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
