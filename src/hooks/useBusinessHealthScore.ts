import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, subMonths, subDays, startOfWeek, subWeeks, format } from 'date-fns';

export interface BusinessHealthData {
  score: number; // 0-100
  components: {
    retention: { score: number; weight: number; value: number; label: string };
    creditHealth: { score: number; weight: number; value: number; label: string };
    revenueTrend: { score: number; weight: number; value: number; label: string };
    payments: { score: number; weight: number; value: number; label: string };
  };
  status: 'excellent' | 'good' | 'warning' | 'critical';
  insights: string[];
  weekChange?: number; // Change in score from last week
  confidence?: number; // Confidence level 0-100
  creditInfo?: {
    clientsWithCredit: number;
    clientsInDebt: number;
    totalActiveClients: number;
    totalDebt?: number;
  };
}

interface HealthSnapshot {
  score: number;
  week_start: string;
}

// Helper to get week key
function getWeekKey(date: Date): string {
  return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function useBusinessHealthScore() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['business-health-score'],
    queryFn: async (): Promise<BusinessHealthData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const thisMonthStart = startOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const sixtyDaysAgo = subDays(now, 60);
      const thisWeekStart = getWeekKey(now);
      const lastWeekStart = getWeekKey(subWeeks(now, 1));

      // Parallel queries - include health snapshots for week comparison
      const [
        clientsResult,
        thisMonthTrainingsResult,
        lastMonthTrainingsResult,
        recentTrainingsResult,
        unpaidResult,
        lastWeekSnapshotResult,
      ] = await Promise.all([
        supabase.from('clients').select('id, is_archived, credit_balance').eq('user_id', user.id),
        supabase
          .from('training_sessions')
          .select('id, final_price, client_id')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('date', thisMonthStart.toISOString()),
        supabase
          .from('training_sessions')
          .select('id, final_price')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('date', lastMonthStart.toISOString())
          .lt('date', thisMonthStart.toISOString()),
        supabase
          .from('training_sessions')
          .select('client_id, date')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('date', sixtyDaysAgo.toISOString()),
        supabase
          .from('training_sessions')
          .select('id, final_price')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .or('payment_status.is.null,payment_status.eq.pending'),
        // Get last week's snapshot for week-over-week comparison
        supabase
          .from('analytics_snapshots')
          .select('metrics')
          .eq('user_id', user.id)
          .eq('scope', 'business_health')
          .eq('period_start', lastWeekStart)
          .maybeSingle(),
      ]);

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

      // 2. CREDIT HEALTH SCORE (25%) - NEW: replaces capacity
      const clientsWithPositiveCredit = activeClients.filter(c => (c.credit_balance || 0) > 0).length;
      const clientsInDebt = activeClients.filter(c => (c.credit_balance || 0) < 0).length;
      const creditHealthRate = activeClients.length > 0 
        ? (clientsWithPositiveCredit / activeClients.length) * 100 
        : 100;
      // Penalize for clients in debt
      const debtPenalty = activeClients.length > 0 
        ? (clientsInDebt / activeClients.length) * 30 
        : 0;
      const creditHealthScore = Math.max(0, Math.min(100, creditHealthRate - debtPenalty));

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
      const weights = { retention: 0.30, creditHealth: 0.25, revenueTrend: 0.25, payments: 0.20 };
      const totalScore = Math.round(
        retentionScore * weights.retention +
        creditHealthScore * weights.creditHealth +
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
      if (clientsInDebt > 0) {
        insights.push(`${clientsInDebt} ${clientsInDebt === 1 ? 'klient je' : clientsInDebt < 5 ? 'klienti jsou' : 'klientů je'} v dluhu.`);
      }
      if (creditHealthRate >= 80 && clientsInDebt === 0) {
        insights.push('Většina klientů má aktivní kredit - výborně!');
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

      // Calculate total debt
      const totalDebt = activeClients
        .filter(c => (c.credit_balance || 0) < 0)
        .reduce((sum, c) => sum + (c.credit_balance || 0), 0);

      // Confidence calculation based on data points
      const dataPoints = thisMonthTrainings.length + lastMonthTrainings.length;
      let confidence = 50;
      if (dataPoints >= 50) confidence = 95;
      else if (dataPoints >= 30) confidence = 85;
      else if (dataPoints >= 15) confidence = 70;
      else if (dataPoints >= 5) confidence = 55;

      // Week-over-week comparison
      let weekChange = 0;
      const lastWeekMetrics = lastWeekSnapshotResult.data?.metrics as unknown as HealthSnapshot | null;
      if (lastWeekMetrics?.score !== undefined) {
        weekChange = totalScore - lastWeekMetrics.score;
      }

      // Store current week's snapshot (upsert)
      supabase
        .from('analytics_snapshots')
        .upsert([{
          user_id: user.id,
          scope: 'business_health',
          period_start: thisWeekStart,
          period_end: thisWeekStart,
          metrics: { score: totalScore, week_start: thisWeekStart },
        }], {
          onConflict: 'user_id,scope,period_start',
        })
        .then(() => {
          // Silent upsert for background storage
        });

      return {
        score: totalScore,
        components: {
          retention: { 
            score: Math.round(retentionScore), 
            weight: weights.retention, 
            value: Math.round(retentionRate),
            label: 'Retence'
          },
          creditHealth: { 
            score: Math.round(creditHealthScore), 
            weight: weights.creditHealth, 
            value: Math.round(creditHealthRate),
            label: 'Zdraví kreditů'
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
        weekChange,
        confidence,
        creditInfo: {
          clientsWithCredit: clientsWithPositiveCredit,
          clientsInDebt,
          totalActiveClients: activeClients.length,
          totalDebt: Math.abs(totalDebt),
        },
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
