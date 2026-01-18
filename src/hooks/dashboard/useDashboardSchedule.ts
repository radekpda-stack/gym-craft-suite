import { useMemo } from 'react';
import { useDashboardCore } from './useDashboardCore';
import type { ScheduleItem } from '@/types/training';
import type { WeeklySummary } from './types';

interface ScheduleData {
  todaySchedule: ScheduleItem[];
  weekSchedule: ScheduleItem[];
  weeklySummary: WeeklySummary;
  todayEstimatedIncome: number;
  uniqueClientsToday: number;
}

/**
 * Hook for fetching schedule and weekly summary data
 * Now uses shared core data to avoid duplicate queries
 */
export function useDashboardSchedule() {
  const core = useDashboardCore();

  const data = useMemo((): ScheduleData | undefined => {
    if (!core.data) return undefined;

    const { todayTrainings, weekTrainings, feedbackRequests, dates } = core.data;
    const { weekStart, weekEnd, lastWeekStart, lastWeekEnd } = dates;

    const completedFeedbackIds = new Set(
      feedbackRequests.filter(f => f.status === 'completed').map(f => f.training_session_id)
    );

    const mapToScheduleItem = (t: typeof todayTrainings[0]): ScheduleItem => ({
      id: t.id,
      clientId: t.client_id,
      clientName: t.clients?.name || 'Neznámý',
      time: new Date(t.date).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
      date: new Date(t.date),
      status: t.status as 'scheduled' | 'completed' | 'cancelled',
      hasFeedback: completedFeedbackIds.has(t.id),
      hasIssue: (t.rpe ?? 0) >= 9,
    });

    // This week trainings (completed)
    const thisWeekTrainings = weekTrainings.filter(t => {
      const date = new Date(t.date);
      return date >= weekStart && date <= weekEnd && t.status === 'completed';
    });

    // Last week trainings (completed)
    const lastWeekTrainings = weekTrainings.filter(t => {
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
      weekSchedule: weekTrainings.map(mapToScheduleItem),
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
  }, [core.data]);

  return {
    data,
    isLoading: core.isLoading,
    isError: core.isError,
    error: core.error,
    refetch: core.refetch,
  };
}
