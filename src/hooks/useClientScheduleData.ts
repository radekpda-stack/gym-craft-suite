import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, addDays } from 'date-fns';

interface NextTraining {
  clientId: string;
  trainingId: string;
  date: string;
}

interface UnpaidTraining {
  clientId: string;
  count: number;
  total: number;
}

interface MissingFeedback {
  clientId: string;
  count: number;
}

export interface ClientScheduleData {
  nextTrainings: Map<string, NextTraining>;
  unpaidTrainings: Map<string, UnpaidTraining>;
  missingFeedbacks: Map<string, MissingFeedback>;
  todayClientIds: Set<string>;
  weekClientIds: Set<string>;
}

export function useClientScheduleData() {
  return useQuery({
    queryKey: ['client-schedule-data'],
    queryFn: async (): Promise<ClientScheduleData> => {
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const weekEnd = endOfDay(addDays(now, 7));

      // Fetch all data in parallel
      const [
        nextTrainingsResult,
        unpaidTrainingsResult,
        feedbackRequestsResult,
        completedTrainingsResult,
      ] = await Promise.all([
        // Next planned trainings for all clients (next 7 days)
        supabase
          .from('training_sessions')
          .select('id, date, client_id')
          .gte('date', now.toISOString())
          .lte('date', weekEnd.toISOString())
          .in('status', ['scheduled', 'confirmed'])
          .order('date', { ascending: true }),

        // Unpaid trainings per client
        supabase
          .from('training_sessions')
          .select('id, client_id, final_price')
          .eq('status', 'completed')
          .eq('payment_status', 'pending'),

        // Feedback requests (completed)
        supabase
          .from('feedback_requests')
          .select('training_session_id, status'),

        // Recent completed trainings (for feedback check)
        supabase
          .from('training_sessions')
          .select('id, client_id, clients(feedback_enabled)')
          .eq('status', 'completed')
          .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      // Process next trainings - get earliest per client
      const nextTrainings = new Map<string, NextTraining>();
      const todayClientIds = new Set<string>();
      const weekClientIds = new Set<string>();

      (nextTrainingsResult.data || []).forEach((t: any) => {
        const clientId = t.client_id;
        const trainingDate = new Date(t.date);
        
        // Track if client has training today or this week
        if (trainingDate >= todayStart && trainingDate <= todayEnd) {
          todayClientIds.add(clientId);
        }
        weekClientIds.add(clientId);
        
        // Store only the earliest training per client
        if (!nextTrainings.has(clientId)) {
          nextTrainings.set(clientId, {
            clientId,
            trainingId: t.id,
            date: t.date,
          });
        }
      });

      // Process unpaid trainings
      const unpaidMap = new Map<string, { count: number; total: number }>();
      (unpaidTrainingsResult.data || []).forEach((t: any) => {
        const clientId = t.client_id;
        const current = unpaidMap.get(clientId) || { count: 0, total: 0 };
        unpaidMap.set(clientId, {
          count: current.count + 1,
          total: current.total + (t.final_price || 0),
        });
      });

      const unpaidTrainings = new Map<string, UnpaidTraining>();
      unpaidMap.forEach((value, clientId) => {
        unpaidTrainings.set(clientId, { clientId, ...value });
      });

      // Process missing feedbacks
      const feedbackRequestIds = new Set(
        (feedbackRequestsResult.data || [])
          .filter((f: any) => f.status === 'completed')
          .map((f: any) => f.training_session_id)
      );

      const missingFeedbackMap = new Map<string, number>();
      (completedTrainingsResult.data || []).forEach((t: any) => {
        const feedbackEnabled = (t.clients as any)?.feedback_enabled !== false;
        if (feedbackEnabled && !feedbackRequestIds.has(t.id)) {
          const clientId = t.client_id;
          missingFeedbackMap.set(clientId, (missingFeedbackMap.get(clientId) || 0) + 1);
        }
      });

      const missingFeedbacks = new Map<string, MissingFeedback>();
      missingFeedbackMap.forEach((count, clientId) => {
        missingFeedbacks.set(clientId, { clientId, count });
      });

      return {
        nextTrainings,
        unpaidTrainings,
        missingFeedbacks,
        todayClientIds,
        weekClientIds,
      };
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}
