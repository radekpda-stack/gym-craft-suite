import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek } from 'date-fns';
import type { ScheduleItem } from '@/types/training';
import type { WeeklySummary, TrainingSessionRow, FeedbackRequestRow } from './types';

interface ScheduleData {
  todaySchedule: ScheduleItem[];
  weekSchedule: ScheduleItem[];
  weeklySummary: WeeklySummary;
  todayEstimatedIncome: number;
  uniqueClientsToday: number;
}

/**
 * Hook for fetching schedule and weekly summary data
 */
export function useDashboardSchedule() {
  return useQuery({
    queryKey: ['dashboard-schedule'],
    queryFn: async (): Promise<ScheduleData> => {
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const lastWeekStart = subDays(weekStart, 7);
      const lastWeekEnd = subDays(weekEnd, 7);

      const [trainingsResult, feedbackResult] = await Promise.all([
        supabase
          .from('training_sessions')
          .select('id, date, status, client_id, rpe, final_price, clients(name)')
          .gte('date', lastWeekStart.toISOString())
          .lte('date', endOfDay(subDays(todayEnd, -6)).toISOString())
          .order('date', { ascending: true }),
        supabase
          .from('feedback_requests')
          .select('training_session_id, status')
          .eq('status', 'completed'),
      ]);

      const allTrainings = (trainingsResult.data || []) as TrainingSessionRow[];
      const feedbackRequests = (feedbackResult.data || []) as FeedbackRequestRow[];
      const feedbackIds = new Set(feedbackRequests.map(f => f.training_session_id));

      const mapToScheduleItem = (t: TrainingSessionRow): ScheduleItem => ({
        id: t.id,
        clientId: t.client_id,
        clientName: t.clients?.name || 'Neznámý',
        time: new Date(t.date).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
        date: new Date(t.date),
        status: t.status as 'scheduled' | 'completed' | 'cancelled',
        hasFeedback: feedbackIds.has(t.id),
        hasIssue: (t.rpe ?? 0) >= 9,
      });

      // Today's trainings
      const todayTrainings = allTrainings.filter(t => {
        const date = new Date(t.date);
        return date >= todayStart && date <= todayEnd;
      });

      // This week trainings (completed)
      const thisWeekTrainings = allTrainings.filter(t => {
        const date = new Date(t.date);
        return date >= weekStart && date <= weekEnd && t.status === 'completed';
      });

      // Last week trainings (completed)
      const lastWeekTrainings = allTrainings.filter(t => {
        const date = new Date(t.date);
        return date >= lastWeekStart && date <= lastWeekEnd && t.status === 'completed';
      });

      const trainingsThisWeek = thisWeekTrainings.length;
      const trainingsLastWeek = lastWeekTrainings.length;
      const incomeThisWeek = thisWeekTrainings.reduce((sum, t) => sum + (t.final_price || 0), 0);
      const incomeLastWeek = lastWeekTrainings.reduce((sum, t) => sum + (t.final_price || 0), 0);

      const getTrend = (current: number, previous: number): 'up' | 'down' | 'stable' => {
        if (current > previous) return 'up';
        if (current < previous) return 'down';
        return 'stable';
      };

      // Today's income
      const todayEstimatedIncome = todayTrainings
        .filter(t => t.status !== 'canceled')
        .reduce((sum, t) => sum + (t.final_price || 0), 0);

      const uniqueClientsToday = new Set(todayTrainings.map(t => t.client_id)).size;

      return {
        todaySchedule: todayTrainings.map(mapToScheduleItem),
        weekSchedule: allTrainings.map(mapToScheduleItem),
        weeklySummary: {
          trainingsThisWeek,
          trainingsLastWeek,
          incomeThisWeek,
          incomeLastWeek,
          weekTrend: getTrend(incomeThisWeek, incomeLastWeek),
          trainingsTrend: getTrend(trainingsThisWeek, trainingsLastWeek),
        },
        todayEstimatedIncome,
        uniqueClientsToday,
      };
    },
    staleTime: 30000,
  });
}
