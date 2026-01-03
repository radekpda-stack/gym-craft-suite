import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, subMonths, subDays, getDaysInMonth } from 'date-fns';
import { useCapacitySettings, calculateMonthlyCapacity } from './useCapacitySettings';

export interface BusinessHealthData {
  score: number; // 0-100
  components: {
    retention: { score: number; weight: number; value: number; label: string };
    capacity: { score: number; weight: number; value: number; label: string };
    revenueTrend: { score: number; weight: number; value: number; label: string };
    payments: { score: number; weight: number; value: number; label: string };
  };
  status: 'excellent' | 'good' | 'warning' | 'critical';
  insights: string[];
  capacityInfo?: {
    maxSlots: number;
    usedSlots: number;
    hoursPerDay: number;
    workingDays: number;
  };
}

export function useBusinessHealthScore() {
  const { settings, isLoading: settingsLoading } = useCapacitySettings();

  return useQuery({
    queryKey: ['business-health-score', settings],
    queryFn: async (): Promise<BusinessHealthData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const thisMonthStart = startOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const sixtyDaysAgo = subDays(now, 60);
      const daysInCurrentMonth = getDaysInMonth(now);

      // Calculate capacity from settings
      const { workingDaysCount, hoursPerDay, totalSlots } = calculateMonthlyCapacity(settings, daysInCurrentMonth);
      const maxCapacity = totalSlots;

      // Parallel queries
      const clientsResult = await supabase.from('clients').select('id, is_archived').eq('user_id', user.id);
      const thisMonthTrainingsResult = await supabase
        .from('training_sessions')
        .select('id, final_price, client_id')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('date', thisMonthStart.toISOString());
      const lastMonthTrainingsResult = await supabase
        .from('training_sessions')
        .select('id, final_price')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('date', lastMonthStart.toISOString())
        .lt('date', thisMonthStart.toISOString());
      const recentTrainingsResult = await supabase
        .from('training_sessions')
        .select('client_id, date')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('date', sixtyDaysAgo.toISOString());
      const unpaidResult = await supabase
        .from('training_sessions')
        .select('id, final_price')
        .eq('user_id', user.id)
        .is('is_paid', false);

      const clients = clientsResult.data || [];
      const activeClients = clients.filter(c => !c.is_archived);
      const thisMonthTrainings = thisMonthTrainingsResult.data || [];
      const lastMonthTrainings = lastMonthTrainingsResult.data || [];
      const recentTrainings = recentTrainingsResult.data || [];
      const unpaidTrainings = unpaidResult.data || [];

      // 1. RETENTION SCORE (30%)
      const recentClientIds = new Set(recentTrainings.map(t => t.client_id));
      const activeWithTrainings = [...recentClientIds].length;
      const retentionRate = activeClients.length > 0 
        ? (activeWithTrainings / activeClients.length) * 100 
        : 0;
      const retentionScore = Math.min(100, retentionRate);

      // 2. CAPACITY SCORE (25%) - using settings
      const capacityUtilization = maxCapacity > 0 
        ? Math.min(100, (thisMonthTrainings.length / maxCapacity) * 100)
        : 0;
      // Optimal is 60-80%, penalize both too low and too high
      let capacityScore = capacityUtilization;
      if (capacityUtilization > 80) {
        capacityScore = 100 - (capacityUtilization - 80); // Penalty for overwork
      } else if (capacityUtilization < 40) {
        capacityScore = capacityUtilization * 1.5; // Lower score for underutilization
      }
      capacityScore = Math.max(0, Math.min(100, capacityScore));

      // 3. REVENUE TREND SCORE (25%)
      const thisMonthRevenue = thisMonthTrainings.reduce((sum, t) => sum + (t.final_price || 0), 0);
      const lastMonthRevenue = lastMonthTrainings.reduce((sum, t) => sum + (t.final_price || 0), 0);
      let revenueTrendPercent = 0;
      if (lastMonthRevenue > 0) {
        revenueTrendPercent = ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
      } else if (thisMonthRevenue > 0) {
        revenueTrendPercent = 100;
      }
      // Map trend to score: -50% = 0, 0% = 50, +50% = 100
      const revenueTrendScore = Math.max(0, Math.min(100, 50 + revenueTrendPercent));

      // 4. PAYMENTS SCORE (20%)
      const unpaidAmount = unpaidTrainings.reduce((sum, t) => sum + (t.final_price || 0), 0);
      const totalRevenue = thisMonthRevenue + unpaidAmount;
      const paidRate = totalRevenue > 0 ? ((totalRevenue - unpaidAmount) / totalRevenue) * 100 : 100;
      const paymentsScore = paidRate;

      // WEIGHTED TOTAL
      const weights = { retention: 0.30, capacity: 0.25, revenueTrend: 0.25, payments: 0.20 };
      const totalScore = Math.round(
        retentionScore * weights.retention +
        capacityScore * weights.capacity +
        revenueTrendScore * weights.revenueTrend +
        paymentsScore * weights.payments
      );

      // STATUS
      let status: BusinessHealthData['status'];
      if (totalScore >= 80) status = 'excellent';
      else if (totalScore >= 60) status = 'good';
      else if (totalScore >= 40) status = 'warning';
      else status = 'critical';

      // INSIGHTS
      const insights: string[] = [];
      if (retentionScore < 70) {
        insights.push('Retence klientů je pod průměrem. Zvažte follow-up u neaktivních klientů.');
      }
      if (capacityUtilization < 50) {
        insights.push('Máte volnou kapacitu. Zkuste oslovit nové klienty.');
      }
      if (capacityUtilization > 90) {
        insights.push('Jste téměř plně vytíženi. Zvažte zvýšení cen nebo rozšíření kapacity.');
      }
      if (revenueTrendPercent < -10) {
        insights.push('Příjmy klesají oproti minulému měsíci.');
      }
      if (unpaidTrainings.length > 5) {
        insights.push(`Máte ${unpaidTrainings.length} nezaplacených tréninků.`);
      }
      if (insights.length === 0) {
        insights.push('Váš byznys je v dobré kondici!');
      }

      return {
        score: totalScore,
        components: {
          retention: { 
            score: Math.round(retentionScore), 
            weight: weights.retention, 
            value: Math.round(retentionRate),
            label: 'Retence klientů'
          },
          capacity: { 
            score: Math.round(capacityScore), 
            weight: weights.capacity, 
            value: Math.round(capacityUtilization),
            label: 'Využití kapacity'
          },
          revenueTrend: { 
            score: Math.round(revenueTrendScore), 
            weight: weights.revenueTrend, 
            value: Math.round(revenueTrendPercent),
            label: 'Trend příjmů'
          },
          payments: { 
            score: Math.round(paymentsScore), 
            weight: weights.payments, 
            value: Math.round(paidRate),
            label: 'Platební morálka'
          },
        },
        status,
        insights,
        capacityInfo: {
          maxSlots: maxCapacity,
          usedSlots: thisMonthTrainings.length,
          hoursPerDay,
          workingDays: workingDaysCount,
        },
      };
    },
    staleTime: 1000 * 60 * 5,
    enabled: !settingsLoading,
  });
}
