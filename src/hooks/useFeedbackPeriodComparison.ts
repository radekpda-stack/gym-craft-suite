/**
 * Hook for comparing feedback metrics between two periods
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, subMonths, startOfDay, endOfDay, startOfMonth, endOfMonth, format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { safeAverage, safeResponseRate } from '@/lib/feedbackCalculations';

export type PeriodType = '7d' | '30d' | '90d' | 'month';

export interface PeriodMetrics {
  periodLabel: string;
  startDate: Date;
  endDate: Date;
  
  // Counts
  totalSent: number;
  totalCompleted: number;
  responseRate: number;
  redFlagsCount: number;
  
  // Averages
  avgBodyFeel: number | null;
  avgSoreness: number | null;
  avgEnergy: number | null;
  avgPain: number | null;
  avgFun: number | null;
  avgRpe: number | null;
  avgResponseTimeHours: number | null;
}

export interface PeriodComparisonData {
  currentPeriod: PeriodMetrics;
  previousPeriod: PeriodMetrics;
  changes: {
    responseRate: number | null;
    redFlagsCount: number | null;
    avgBodyFeel: number | null;
    avgSoreness: number | null;
    avgEnergy: number | null;
    avgPain: number | null;
    avgFun: number | null;
  };
}

function getPeriodDates(periodType: PeriodType, offset: number = 0): { start: Date; end: Date; label: string } {
  const now = new Date();
  
  if (periodType === 'month') {
    const targetMonth = subMonths(now, offset);
    return {
      start: startOfMonth(targetMonth),
      end: endOfMonth(targetMonth),
      label: format(targetMonth, 'LLLL yyyy', { locale: cs }),
    };
  }
  
  const days = periodType === '7d' ? 7 : periodType === '30d' ? 30 : 90;
  const endDate = subDays(now, offset * days);
  const startDate = subDays(endDate, days);
  
  return {
    start: startOfDay(startDate),
    end: endOfDay(endDate),
    label: `${format(startDate, 'd.M.', { locale: cs })} - ${format(endDate, 'd.M.', { locale: cs })}`,
  };
}

async function fetchPeriodMetrics(
  start: Date,
  end: Date,
  label: string,
  clientId?: string
): Promise<PeriodMetrics> {
  // Fetch requests
  let requestsQuery = supabase
    .from('feedback_requests')
    .select('id, client_id, status, sent_at, completed_at')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());
  
  if (clientId) {
    requestsQuery = requestsQuery.eq('client_id', clientId);
  }
  
  const { data: requests } = await requestsQuery;
  
  const completedIds = (requests || [])
    .filter(r => r.status === 'completed')
    .map(r => r.id);
  
  // Fetch feedbacks
  let feedbacks: any[] = [];
  if (completedIds.length > 0) {
    const { data } = await supabase
      .from('training_feedback')
      .select('body_feel, soreness, energy, pain, fun, rpe_rating, is_red_flag')
      .in('feedback_request_id', completedIds);
    feedbacks = data || [];
  }
  
  // Calculate metrics
  const totalSent = (requests || []).filter(r => r.sent_at).length;
  const totalCompleted = completedIds.length;
  // Use safe response rate to ensure ≤100% and completed ≤ sent
  const responseRate = safeResponseRate(totalCompleted, totalSent);
  const redFlagsCount = feedbacks.filter(f => f.is_red_flag).length;
  
  const responseTimes = (requests || [])
    .filter(r => r.sent_at && r.completed_at)
    .map(r => {
      const sent = new Date(r.sent_at!);
      const completed = new Date(r.completed_at!);
      return (completed.getTime() - sent.getTime()) / (1000 * 60 * 60);
    });
  
  return {
    periodLabel: label,
    startDate: start,
    endDate: end,
    totalSent,
    totalCompleted,
    responseRate,
    redFlagsCount,
    avgBodyFeel: safeAverage(feedbacks.map(f => f.body_feel)),
    avgSoreness: safeAverage(feedbacks.map(f => f.soreness)),
    // Use energy_rating - correct field name from DB
    avgEnergy: safeAverage(feedbacks.map(f => f.energy_rating ?? f.energy)),
    avgPain: safeAverage(feedbacks.map(f => f.pain)),
    avgFun: safeAverage(feedbacks.map(f => f.fun)),
    avgRpe: safeAverage(feedbacks.map(f => f.rpe_rating)),
    avgResponseTimeHours: safeAverage(responseTimes),
  };
}

export function useFeedbackPeriodComparison(
  periodType: PeriodType = '30d',
  clientId?: string
) {
  return useQuery({
    queryKey: ['feedback-period-comparison', periodType, clientId],
    queryFn: async (): Promise<PeriodComparisonData> => {
      const currentDates = getPeriodDates(periodType, 0);
      const previousDates = getPeriodDates(periodType, 1);
      
      const [currentPeriod, previousPeriod] = await Promise.all([
        fetchPeriodMetrics(currentDates.start, currentDates.end, currentDates.label, clientId),
        fetchPeriodMetrics(previousDates.start, previousDates.end, previousDates.label, clientId),
      ]);
      
      const diff = (a: number | null, b: number | null): number | null => {
        if (a === null || b === null) return null;
        return Math.round((a - b) * 10) / 10;
      };
      
      return {
        currentPeriod,
        previousPeriod,
        changes: {
          responseRate: diff(currentPeriod.responseRate, previousPeriod.responseRate),
          redFlagsCount: diff(currentPeriod.redFlagsCount, previousPeriod.redFlagsCount),
          avgBodyFeel: diff(currentPeriod.avgBodyFeel, previousPeriod.avgBodyFeel),
          avgSoreness: diff(currentPeriod.avgSoreness, previousPeriod.avgSoreness),
          avgEnergy: diff(currentPeriod.avgEnergy, previousPeriod.avgEnergy),
          avgPain: diff(currentPeriod.avgPain, previousPeriod.avgPain),
          avgFun: diff(currentPeriod.avgFun, previousPeriod.avgFun),
        },
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
