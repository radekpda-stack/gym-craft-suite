/**
 * Hook to calculate trainer's baseline metrics across all clients
 * Used for client vs. average comparison
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay } from 'date-fns';
import { safeAverage, safeResponseRate } from '@/lib/feedbackCalculations';

export interface BaselineMetrics {
  avgBodyFeel: number | null;
  avgSoreness: number | null;
  avgEnergy: number | null;
  avgPain: number | null;
  avgFun: number | null;
  avgRpe: number | null;
  totalFeedbacks: number;
  responseRate: number;
  avgResponseTimeHours: number | null;
}

export interface ClientVsBaseline {
  clientId: string;
  clientName: string;
  clientMetrics: BaselineMetrics;
  baselineMetrics: BaselineMetrics;
  differences: {
    bodyFeel: number | null;
    soreness: number | null;
    energy: number | null;
    pain: number | null;
    fun: number | null;
  };
}

export function useTrainerFeedbackBaseline(days: number = 90) {
  return useQuery({
    queryKey: ['trainer-feedback-baseline', days],
    queryFn: async (): Promise<BaselineMetrics> => {
      const startDate = subDays(new Date(), days);
      
      // Get all feedback requests in period
      const { data: requests } = await supabase
        .from('feedback_requests')
        .select('id, status, sent_at, completed_at')
        .gte('created_at', startOfDay(startDate).toISOString());
      
      const completedIds = (requests || [])
        .filter(r => r.status === 'completed')
        .map(r => r.id);
      
      // Get feedback data
      let feedbacks: any[] = [];
      if (completedIds.length > 0) {
        const { data } = await supabase
          .from('training_feedback')
          .select('body_feel, soreness, energy, pain, fun, rpe_rating');
        feedbacks = (data || []).filter((_, i) => i < completedIds.length);
        
        // Proper fetch
        const { data: properData } = await supabase
          .from('training_feedback')
          .select('body_feel, soreness, energy, pain, fun, rpe_rating')
          .in('feedback_request_id', completedIds);
        feedbacks = properData || [];
      }
      
      // Calculate averages (use energy_rating - correct field name)
      const bodyFeelValues = feedbacks.map(f => f.body_feel).filter(v => v !== null);
      const sorenessValues = feedbacks.map(f => f.soreness).filter(v => v !== null);
      const energyValues = feedbacks.map(f => f.energy_rating ?? f.energy).filter(v => v !== null);
      const painValues = feedbacks.map(f => f.pain).filter(v => v !== null);
      const funValues = feedbacks.map(f => f.fun).filter(v => v !== null);
      const rpeValues = feedbacks.map(f => f.rpe_rating).filter(v => v !== null);
      
      // Response rate with safe limits (≤100%, completed ≤ sent)
      const totalSent = (requests || []).filter(r => r.sent_at).length;
      const totalCompleted = completedIds.length;
      const responseRate = safeResponseRate(totalCompleted, totalSent);
      
      // Response time
      const responseTimes = (requests || [])
        .filter(r => r.sent_at && r.completed_at)
        .map(r => {
          const sent = new Date(r.sent_at!);
          const completed = new Date(r.completed_at!);
          return (completed.getTime() - sent.getTime()) / (1000 * 60 * 60);
        });
      
      return {
        avgBodyFeel: safeAverage(bodyFeelValues),
        avgSoreness: safeAverage(sorenessValues),
        avgEnergy: safeAverage(energyValues),
        avgPain: safeAverage(painValues),
        avgFun: safeAverage(funValues),
        avgRpe: safeAverage(rpeValues),
        totalFeedbacks: feedbacks.length,
        responseRate,
        avgResponseTimeHours: safeAverage(responseTimes),
      };
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useClientVsBaseline(clientId: string, days: number = 90) {
  return useQuery({
    queryKey: ['client-vs-baseline', clientId, days],
    queryFn: async (): Promise<ClientVsBaseline | null> => {
      const startDate = subDays(new Date(), days);
      
      // Get client name
      const { data: client } = await supabase
        .from('clients')
        .select('name')
        .eq('id', clientId)
        .single();
      
      if (!client) return null;
      
      // Get ALL feedback requests (for baseline)
      const { data: allRequests } = await supabase
        .from('feedback_requests')
        .select('id, client_id, status, sent_at, completed_at')
        .gte('created_at', startOfDay(startDate).toISOString());
      
      const allCompletedIds = (allRequests || [])
        .filter(r => r.status === 'completed')
        .map(r => r.id);
      
      const clientCompletedIds = (allRequests || [])
        .filter(r => r.status === 'completed' && r.client_id === clientId)
        .map(r => r.id);
      
      // Get all feedbacks
      let allFeedbacks: any[] = [];
      if (allCompletedIds.length > 0) {
        const { data } = await supabase
          .from('training_feedback')
          .select('feedback_request_id, body_feel, soreness, energy, pain, fun, rpe_rating')
          .in('feedback_request_id', allCompletedIds);
        allFeedbacks = data || [];
      }
      
      // Split into client and baseline (all others)
      const clientFeedbacks = allFeedbacks.filter(f => 
        clientCompletedIds.includes(f.feedback_request_id)
      );
      const baselineFeedbacks = allFeedbacks.filter(f => 
        !clientCompletedIds.includes(f.feedback_request_id)
      );
      
      const calcMetrics = (feedbacks: any[], requests: any[], forClient: boolean): BaselineMetrics => {
        const relevantRequests = forClient 
          ? (requests || []).filter(r => r.client_id === clientId)
          : (requests || []).filter(r => r.client_id !== clientId);
        
        const totalSent = relevantRequests.filter(r => r.sent_at).length;
        const totalCompleted = relevantRequests.filter(r => r.status === 'completed').length;
        
        const responseTimes = relevantRequests
          .filter(r => r.sent_at && r.completed_at)
          .map(r => {
            const sent = new Date(r.sent_at!);
            const completed = new Date(r.completed_at!);
            return (completed.getTime() - sent.getTime()) / (1000 * 60 * 60);
          });
        
        return {
          avgBodyFeel: safeAverage(feedbacks.map(f => f.body_feel)),
          avgSoreness: safeAverage(feedbacks.map(f => f.soreness)),
          // Use energy_rating - correct field name
          avgEnergy: safeAverage(feedbacks.map(f => f.energy_rating ?? f.energy)),
          avgPain: safeAverage(feedbacks.map(f => f.pain)),
          avgFun: safeAverage(feedbacks.map(f => f.fun)),
          avgRpe: safeAverage(feedbacks.map(f => f.rpe_rating)),
          totalFeedbacks: feedbacks.length,
          // Use safe response rate
          responseRate: safeResponseRate(totalCompleted, totalSent),
          avgResponseTimeHours: safeAverage(responseTimes),
        };
      };
      
      const clientMetrics = calcMetrics(clientFeedbacks, allRequests || [], true);
      const baselineMetrics = calcMetrics(baselineFeedbacks, allRequests || [], false);
      
      const diff = (a: number | null, b: number | null): number | null => {
        if (a === null || b === null) return null;
        return Math.round((a - b) * 10) / 10;
      };
      
      return {
        clientId,
        clientName: client.name,
        clientMetrics,
        baselineMetrics,
        differences: {
          bodyFeel: diff(clientMetrics.avgBodyFeel, baselineMetrics.avgBodyFeel),
          soreness: diff(clientMetrics.avgSoreness, baselineMetrics.avgSoreness),
          energy: diff(clientMetrics.avgEnergy, baselineMetrics.avgEnergy),
          pain: diff(clientMetrics.avgPain, baselineMetrics.avgPain),
          fun: diff(clientMetrics.avgFun, baselineMetrics.avgFun),
        },
      };
    },
    enabled: !!clientId,
    staleTime: 1000 * 60 * 5,
  });
}
