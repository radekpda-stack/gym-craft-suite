import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subDays } from 'date-fns';
import type { TrendData, TrainingSessionRow, CreditTransactionRow, TrainingParticipantRow } from './types';

/**
 * Hook for fetching trend data
 */
export function useDashboardTrends() {
  return useQuery({
    queryKey: ['dashboard-trends'],
    queryFn: async (): Promise<TrendData> => {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));
      const yearStart = startOfYear(now);
      const yearEnd = endOfYear(now);
      const thirtyDaysAgo = subDays(now, 30);

      const [thisMonthResult, lastMonthResult, yearlyResult, activeResult, lastMonthActiveResult, newClientsResult, allCompletedResult, creditResult, productResult, lifetimeResult] = await Promise.all([
        supabase.from('training_sessions').select('id, status, final_price').gte('date', monthStart.toISOString()).lte('date', monthEnd.toISOString()),
        supabase.from('training_sessions').select('id, status, final_price').gte('date', lastMonthStart.toISOString()).lte('date', lastMonthEnd.toISOString()),
        supabase.from('training_sessions').select('id, final_price').gte('date', yearStart.toISOString()).lte('date', yearEnd.toISOString()).eq('status', 'completed'),
        supabase.from('training_participants').select('client_id, training_sessions!inner(date, status)').gte('training_sessions.date', thirtyDaysAgo.toISOString()).eq('training_sessions.status', 'completed'),
        supabase.from('training_participants').select('client_id, training_sessions!inner(date, status)').gte('training_sessions.date', lastMonthStart.toISOString()).lte('training_sessions.date', lastMonthEnd.toISOString()).eq('training_sessions.status', 'completed'),
        supabase.from('clients').select('id').gte('created_at', monthStart.toISOString()).eq('is_archived', false),
        supabase.from('training_sessions').select('id, date').eq('status', 'completed'),
        supabase.from('credit_transactions').select('amount, type').in('type', ['payment', 'manual']).gte('created_at', monthStart.toISOString()).lte('created_at', monthEnd.toISOString()),
        supabase.from('credit_transactions').select('amount').eq('type', 'product').gte('created_at', monthStart.toISOString()).lte('created_at', monthEnd.toISOString()),
        supabase.from('credit_transactions').select('client_id, amount, clients(name)').lt('amount', 0),
      ]);

      const thisMonth = (thisMonthResult.data || []) as TrainingSessionRow[];
      const lastMonth = (lastMonthResult.data || []) as TrainingSessionRow[];
      const yearly = (yearlyResult.data || []) as TrainingSessionRow[];
      
      const thisMonthCompleted = thisMonth.filter(t => t.status === 'completed').length;
      const lastMonthCompleted = lastMonth.filter(t => t.status === 'completed').length;
      const thisMonthIncome = thisMonth.filter(t => t.status === 'completed').reduce((s, t) => s + (t.final_price || 0), 0);
      const lastMonthIncome = lastMonth.filter(t => t.status === 'completed').reduce((s, t) => s + (t.final_price || 0), 0);
      const thisMonthCancelled = thisMonth.filter(t => t.status === 'canceled').length;

      const activeClientIds = new Set((activeResult.data as TrainingParticipantRow[] || []).map(p => p.client_id));
      const lastMonthActiveIds = new Set((lastMonthActiveResult.data as TrainingParticipantRow[] || []).map(p => p.client_id));
      const retainedClients = [...lastMonthActiveIds].filter(id => activeClientIds.has(id)).length;

      const productIncome = (productResult.data || []).reduce((s, t: CreditTransactionRow) => s + Math.abs(t.amount || 0), 0);
      const trainingIncome = (creditResult.data || []).reduce((s, t: CreditTransactionRow) => s + (t.amount || 0), 0);
      const totalRevenue = trainingIncome + productIncome;

      const creditTx = (creditResult.data || []) as CreditTransactionRow[];
      const creditsReceived = creditTx.reduce((s, t) => s + (t.amount > 0 ? t.amount : 0), 0);

      const allCompleted = (allCompletedResult.data || []) as TrainingSessionRow[];
      const dayNames = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
      const dayCountMap = new Map<number, number>();
      const hourCountMap = new Map<number, number>();
      allCompleted.forEach(t => {
        const d = new Date(t.date);
        dayCountMap.set(d.getDay(), (dayCountMap.get(d.getDay()) || 0) + 1);
        hourCountMap.set(d.getHours(), (hourCountMap.get(d.getHours()) || 0) + 1);
      });
      const dayDistribution = dayNames.map((day, idx) => ({ day, count: dayCountMap.get(idx) || 0 })).sort((a, b) => b.count - a.count);
      const hourDistribution = Array.from(hourCountMap.entries()).map(([hour, count]) => ({ hour, count })).sort((a, b) => b.count - a.count);

      const lifetimeData = (lifetimeResult.data || []) as CreditTransactionRow[];
      const clientSpendMap = new Map<string, { name: string; value: number }>();
      lifetimeData.forEach(t => {
        const cid = t.client_id || '';
        const name = t.clients?.name || 'Neznámý';
        const amount = Math.abs(t.amount || 0);
        if (clientSpendMap.has(cid)) clientSpendMap.get(cid)!.value += amount;
        else clientSpendMap.set(cid, { name, value: amount });
      });
      const topClients = Array.from(clientSpendMap.values()).sort((a, b) => b.value - a.value).slice(0, 5);

      return {
        trainingsThisMonth: thisMonthCompleted, trainingsLastMonth: lastMonthCompleted,
        trainingsChange: lastMonthCompleted > 0 ? Math.round(((thisMonthCompleted - lastMonthCompleted) / lastMonthCompleted) * 100) : 0,
        incomeThisMonth: thisMonthIncome, incomeLastMonth: lastMonthIncome,
        incomeChange: lastMonthIncome > 0 ? Math.round(((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100) : 0,
        cancellationRate: thisMonth.length > 0 ? Math.round((thisMonthCancelled / thisMonth.length) * 100) : 0,
        cancelledCount: thisMonthCancelled, totalTrainingsCount: thisMonth.length,
        productShare: totalRevenue > 0 ? Math.round((productIncome / totalRevenue) * 100) : 0,
        productIncome, totalRevenue, creditsReceived, creditsReceivedCount: creditTx.filter(t => t.amount > 0).length,
        yearlyHours: yearly.length, yearlyIncome: yearly.reduce((s, t) => s + (t.final_price || 0), 0),
        avgHourlyRate: yearly.length > 0 ? Math.round(yearly.reduce((s, t) => s + (t.final_price || 0), 0) / yearly.length) : 0,
        activeClients: activeClientIds.size, totalClients: 0, newClientsThisMonth: (newClientsResult.data || []).length,
        retentionRate: lastMonthActiveIds.size > 0 ? Math.round((retainedClients / lastMonthActiveIds.size) * 100) : 0,
        retainedClients, lastMonthActiveClients: lastMonthActiveIds.size,
        busiestDay: dayDistribution[0]?.day || 'N/A', busiestDayCount: dayDistribution[0]?.count || 0,
        dayDistribution, hourDistribution,
        topClientName: topClients[0]?.name || 'N/A', topClientValue: topClients[0]?.value || 0, topClients,
      };
    },
    staleTime: 120000,
  });
}
