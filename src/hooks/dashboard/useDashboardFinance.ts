import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useAppSettings } from '@/hooks/useAppSettings';
import type { FinanceMetrics, ClientRow, BudgetMemberRow, UnpaidTrainingRow, TrainingSessionRow } from './types';

/**
 * Hook for fetching finance metrics
 */
export function useDashboardFinance() {
  const { data: appSettings } = useAppSettings();

  return useQuery({
    queryKey: ['dashboard-finance', appSettings?.low_credit_threshold],
    queryFn: async (): Promise<FinanceMetrics> => {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));
      const lowCreditThreshold = (appSettings?.low_credit_threshold as number) || 800;

      const [clientsResult, budgetMembersResult, thisMonthResult, lastMonthResult, unpaidResult] = await Promise.all([
        supabase.from('clients').select('id, name, credit_balance, payment_mode, is_archived').eq('is_archived', false),
        supabase.from('client_budget_members').select('client_id'),
        supabase.from('training_sessions').select('id, status, final_price, participant_count').gte('date', monthStart.toISOString()).lte('date', monthEnd.toISOString()),
        supabase.from('training_sessions').select('id, status, final_price').gte('date', lastMonthStart.toISOString()).lte('date', lastMonthEnd.toISOString()),
        supabase.from('training_sessions').select('id, date, final_price, client_id').eq('status', 'completed').eq('payment_status', 'pending'),
      ]);

      const budgetMemberIds = new Set((budgetMembersResult.data as BudgetMemberRow[] || []).map(m => m.client_id));
      const eligibleClients = ((clientsResult.data || []) as ClientRow[]).filter(c => c.payment_mode !== 'cash_only' && !budgetMemberIds.has(c.id));
      
      const creditAtRiskClients = eligibleClients.filter(c => (c.credit_balance || 0) < lowCreditThreshold);
      const creditAtRiskAmount = creditAtRiskClients.reduce((sum, c) => sum + Math.max(0, lowCreditThreshold - (c.credit_balance || 0)), 0);

      const unpaidItems = (unpaidResult.data || []) as UnpaidTrainingRow[];
      const unpaidTotalAmount = unpaidItems.reduce((sum, t) => sum + (t.final_price || 0), 0);

      const thisMonthTrainings = (thisMonthResult.data || []) as TrainingSessionRow[];
      const lastMonthTrainings = (lastMonthResult.data || []) as TrainingSessionRow[];

      const thisMonthIncome = thisMonthTrainings.filter(t => t.status === 'completed').reduce((sum, t) => sum + (t.final_price || 0), 0);
      const lastMonthIncome = lastMonthTrainings.filter(t => t.status === 'completed').reduce((sum, t) => sum + (t.final_price || 0), 0);

      const trainingsWithPrice = thisMonthTrainings.filter(t => t.status === 'completed' && t.final_price && t.final_price > 0);
      const avgPerTraining = trainingsWithPrice.length > 0 ? Math.round(thisMonthIncome / trainingsWithPrice.length) : 0;

      const lastMonthTrainingsWithPrice = lastMonthTrainings.filter(t => t.status === 'completed' && t.final_price && t.final_price > 0);
      const lastMonthAvgPerTraining = lastMonthTrainingsWithPrice.length > 0 ? Math.round(lastMonthIncome / lastMonthTrainingsWithPrice.length) : 0;

      const incomeChange = lastMonthIncome > 0 ? Math.round(((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100) : 0;

      const calcBreakdown = (trainings: TrainingSessionRow[]) => {
        const total = trainings.reduce((sum, t) => sum + (t.final_price || 0), 0);
        return { count: trainings.length, avgPrice: trainings.length > 0 ? Math.round(total / trainings.length) : 0, totalPrice: total };
      };

      return {
        creditAtRisk: { count: creditAtRiskClients.length, amount: creditAtRiskAmount },
        unpaidTotal: { count: unpaidItems.length, amount: unpaidTotalAmount },
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
    },
    staleTime: 60000,
  });
}
