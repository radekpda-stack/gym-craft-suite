import { useMemo } from 'react';
import { useDashboardCore } from './useDashboardCore';
import { useAppSettings } from '@/hooks/useAppSettings';
import type { FinanceMetrics } from './types';

/**
 * Hook for fetching finance metrics
 * Now uses shared core data to avoid duplicate queries
 */
export function useDashboardFinance() {
  const { data: appSettings } = useAppSettings();
  const core = useDashboardCore();

  const data = useMemo((): FinanceMetrics | undefined => {
    if (!core.data) return undefined;

    const lowCreditThreshold = (appSettings?.low_credit_threshold as number) || 800;
    const { clients, budgetMemberIds, thisMonthTrainings, lastMonthTrainings, unpaidTrainings } = core.data;

    // Eligible clients (not cash_only and not in budget group)
    const eligibleClients = clients.filter(
      c => c.payment_mode !== 'cash_only' && !budgetMemberIds.has(c.id)
    );

    const creditAtRiskClients = eligibleClients.filter(c => (c.credit_balance || 0) < lowCreditThreshold);
    const creditAtRiskAmount = creditAtRiskClients.reduce(
      (sum, c) => sum + Math.max(0, lowCreditThreshold - (c.credit_balance || 0)), 
      0
    );

    const unpaidTotalAmount = unpaidTrainings.reduce((sum, t) => sum + (t.final_price || 0), 0);

    const thisMonthCompleted = thisMonthTrainings.filter(t => t.status === 'completed');
    const lastMonthCompleted = lastMonthTrainings.filter(t => t.status === 'completed');

    const thisMonthIncome = thisMonthCompleted.reduce((sum, t) => sum + (t.final_price || 0), 0);
    const lastMonthIncome = lastMonthCompleted.reduce((sum, t) => sum + (t.final_price || 0), 0);

    const trainingsWithPrice = thisMonthCompleted.filter(t => t.final_price && t.final_price > 0);
    const avgPerTraining = trainingsWithPrice.length > 0 ? Math.round(thisMonthIncome / trainingsWithPrice.length) : 0;

    const lastMonthTrainingsWithPrice = lastMonthCompleted.filter(t => t.final_price && t.final_price > 0);
    const lastMonthAvgPerTraining = lastMonthTrainingsWithPrice.length > 0 
      ? Math.round(lastMonthIncome / lastMonthTrainingsWithPrice.length) 
      : 0;

    const incomeChange = lastMonthIncome > 0 
      ? Math.round(((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100) 
      : 0;

    const calcBreakdown = (trainings: typeof trainingsWithPrice) => {
      const total = trainings.reduce((sum, t) => sum + (t.final_price || 0), 0);
      return { 
        count: trainings.length, 
        avgPrice: trainings.length > 0 ? Math.round(total / trainings.length) : 0, 
        totalPrice: total 
      };
    };

    return {
      creditAtRisk: { count: creditAtRiskClients.length, amount: creditAtRiskAmount },
      unpaidTotal: { count: unpaidTrainings.length, amount: unpaidTotalAmount },
      monthlyIncome: thisMonthIncome,
      lastMonthIncome,
      avgPerTraining,
      lastMonthAvgPerTraining,
      trainingsWithPriceCount: trainingsWithPrice.length,
      incomeChange,
      trainingsByParticipants: {
        solo: calcBreakdown(trainingsWithPrice.filter(t => !t.participant_count || t.participant_count === 1)),
        duo: calcBreakdown(trainingsWithPrice.filter(t => t.participant_count === 2)),
        group: calcBreakdown(trainingsWithPrice.filter(t => (t.participant_count || 0) >= 3)),
      },
    };
  }, [core.data, appSettings?.low_credit_threshold]);

  return {
    data,
    isLoading: core.isLoading,
    isError: core.isError,
    error: core.error,
    refetch: core.refetch,
  };
}
