import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format, eachDayOfInterval, eachWeekOfInterval } from 'date-fns';

export type TimeRange = '7' | '30' | '90' | '180';

interface TrendDataPoint {
  date: string;
  value: number;
  label?: string;
}

interface RevenueTrendPoint {
  date: string;
  creditTopUp: number;
  total: number;
}

interface RecommendedAction {
  type: 'overdue' | 'low_credit' | 'inactive' | 'cancellations';
  label: string;
  description: string;
  link: string;
  filters?: Record<string, string>;
  count?: number;
}

export interface BusinessHealthTrendData {
  // Current state
  currentScore: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  confidence: number;
  baselineWindow: number;
  lastComputed: string;
  
  // Components with detailed info
  components: {
    retention: { score: number; weight: number; current: number; baseline: number };
    creditHealth: { score: number; weight: number; current: number; baseline: number };
    revenueTrend: { score: number; weight: number; current: number; baseline: number };
    payments: { score: number; weight: number; current: number; baseline: number };
  };
  
  // Explanations
  explanations: string[];
  
  // Trend data
  revenueTrend: RevenueTrendPoint[];
  sessionsTrend: TrendDataPoint[];
  cancellationsTrend: TrendDataPoint[];
  overdueTrend: TrendDataPoint[];
  
  // Recommended actions
  recommendedActions: RecommendedAction[];
}

export function useBusinessHealthTrends(range: TimeRange = '30') {
  const days = parseInt(range);
  
  return useQuery({
    queryKey: ['business-health-trends', range],
    queryFn: async (): Promise<BusinessHealthTrendData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const startDate = subDays(now, days);
      const baselineWeeks = 8;

      // Fetch all necessary data in parallel
      const [
        clientsResult,
        trainingsResult,
        cancelledResult,
        creditTopUpsResult,
      ] = await Promise.all([
        supabase
          .from('clients')
          .select('id, name, is_archived, credit_balance')
          .eq('user_id', user.id),
        supabase
          .from('training_sessions')
          .select('id, date, final_price, client_id, payment_status, participant_count')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('date', startDate.toISOString())
          .order('date', { ascending: true }),
        supabase
          .from('training_sessions')
          .select('id, date, client_id')
          .eq('user_id', user.id)
          .in('status', ['cancelled', 'no_show'])
          .gte('date', startDate.toISOString())
          .order('date', { ascending: true }),
        supabase
          .from('credit_transactions')
          .select('id, amount, created_at')
          .eq('user_id', user.id)
          .eq('type', 'topup')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true }),
      ]);

      const clients = clientsResult.data || [];
      const trainings = trainingsResult.data || [];
      const cancelled = cancelledResult.data || [];
      const creditTopUps = creditTopUpsResult.data || [];
      
      const activeClients = clients.filter(c => !c.is_archived);
      const clientsInDebt = activeClients.filter(c => (c.credit_balance || 0) < 0);
      const clientsLowCredit = activeClients.filter(c => (c.credit_balance || 0) > 0 && (c.credit_balance || 0) <= 1);

      // Generate date intervals based on range
      const useWeekly = days > 30;
      const intervals = useWeekly 
        ? eachWeekOfInterval({ start: startDate, end: now })
        : eachDayOfInterval({ start: startDate, end: now });

      // Calculate revenue trend
      const revenueTrend: RevenueTrendPoint[] = intervals.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const nextDate = useWeekly 
          ? new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000)
          : new Date(date.getTime() + 24 * 60 * 60 * 1000);
        
        const creditTotal = creditTopUps
          .filter(t => {
            const d = new Date(t.created_at);
            return d >= date && d < nextDate;
          })
          .reduce((sum, t) => sum + (t.amount || 0), 0);
          
        return {
          date: dateStr,
          creditTopUp: creditTotal,
          total: creditTotal,
        };
      });

      // Calculate sessions trend (using participant_count as seats proxy)
      const sessionsTrend: TrendDataPoint[] = intervals.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const nextDate = useWeekly 
          ? new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000)
          : new Date(date.getTime() + 24 * 60 * 60 * 1000);
        
        const sessions = trainings.filter(t => {
          const d = new Date(t.date);
          return d >= date && d < nextDate;
        });
        
        const totalParticipants = sessions.reduce((sum, t) => sum + (t.participant_count || 1), 0);
          
        return { date: dateStr, value: totalParticipants };
      });

      // Calculate cancellation trend
      const cancellationsTrend: TrendDataPoint[] = intervals.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const nextDate = useWeekly 
          ? new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000)
          : new Date(date.getTime() + 24 * 60 * 60 * 1000);
        
        const cancelledCount = cancelled.filter(t => {
          const d = new Date(t.date);
          return d >= date && d < nextDate;
        }).length;
        
        const completedCount = trainings.filter(t => {
          const d = new Date(t.date);
          return d >= date && d < nextDate;
        }).length;
        
        const total = cancelledCount + completedCount;
        const rate = total > 0 ? Math.round((cancelledCount / total) * 100) : 0;
          
        return { date: dateStr, value: rate, label: `${cancelledCount}/${total}` };
      });

      // Overdue trend (simplified snapshot)
      const overdueTrend: TrendDataPoint[] = intervals.slice(-7).map((date) => ({
        date: format(date, 'yyyy-MM-dd'),
        value: clientsInDebt.length,
      }));

      // Calculate current metrics
      const last28Days = subDays(now, 28);
      const recentTrainings = trainings.filter(t => new Date(t.date) >= last28Days);
      const recentCancelled = cancelled.filter(t => new Date(t.date) >= last28Days);
      
      const recentRevenue = recentTrainings.reduce((sum, t) => sum + (t.final_price || 0), 0);
      
      // Active clients calculation
      const recentClientIds = new Set(recentTrainings.map(t => t.client_id));
      const retentionRate = activeClients.length > 0 
        ? Math.round((recentClientIds.size / activeClients.length) * 100) 
        : 0;
      
      // Credit health
      const clientsWithCredit = activeClients.filter(c => (c.credit_balance || 0) > 0).length;
      const creditHealthRate = activeClients.length > 0 
        ? Math.round((clientsWithCredit / activeClients.length) * 100) 
        : 100;
      
      // Payments
      const unpaidCount = recentTrainings.filter(t => 
        !t.payment_status || t.payment_status === 'pending'
      ).length;
      const paidRate = recentTrainings.length > 0 
        ? Math.round(((recentTrainings.length - unpaidCount) / recentTrainings.length) * 100) 
        : 100;
      
      // Calculate baseline
      const baselineRevenue = revenueTrend.length > 0 
        ? Math.round(revenueTrend.reduce((sum, r) => sum + r.total, 0) / revenueTrend.length * 4) 
        : 0;

      // Calculate scores
      const weights = { retention: 0.30, creditHealth: 0.25, revenueTrend: 0.25, payments: 0.20 };
      const retentionScore = Math.min(100, retentionRate);
      const creditScore = Math.max(0, creditHealthRate - (clientsInDebt.length / Math.max(1, activeClients.length) * 30));
      const revenueScore = 50 + Math.min(50, Math.max(-50, ((recentRevenue - baselineRevenue) / Math.max(1, baselineRevenue)) * 50));
      const paymentScore = paidRate;
      
      const totalScore = Math.round(
        retentionScore * weights.retention +
        creditScore * weights.creditHealth +
        revenueScore * weights.revenueTrend +
        paymentScore * weights.payments
      );

      // Status
      let status: 'excellent' | 'good' | 'warning' | 'critical';
      if (totalScore >= 80) status = 'excellent';
      else if (totalScore >= 60) status = 'good';
      else if (totalScore >= 40) status = 'warning';
      else status = 'critical';

      // Confidence
      const dataPoints = trainings.length + cancelled.length + creditTopUps.length;
      const confidence = Math.min(100, Math.round((dataPoints / (days * 0.5)) * 100));

      // Generate explanations
      const explanations: string[] = [];
      
      if (recentRevenue < baselineRevenue * 0.5 && baselineRevenue > 0) {
        const diff = Math.round((1 - recentRevenue / baselineRevenue) * 100);
        explanations.push(`Příjem -${diff}% vs tvoje baseline (28 dní).`);
      } else if (recentRevenue > baselineRevenue * 1.2 && baselineRevenue > 0) {
        const diff = Math.round((recentRevenue / baselineRevenue - 1) * 100);
        explanations.push(`Příjem +${diff}% vs baseline - skvělé!`);
      }
      
      if (recentCancelled.length > 2) {
        explanations.push(`Zrušené tréninky tento měsíc: ${recentCancelled.length}.`);
      }
      
      if (clientsInDebt.length > 0) {
        const totalDebt = clientsInDebt.reduce((sum, c) => sum + Math.abs(c.credit_balance || 0), 0);
        explanations.push(`${clientsInDebt.length} ${clientsInDebt.length === 1 ? 'klient v dluhu' : 'klientů v dluhu'}: ${totalDebt.toLocaleString()} Kč.`);
      }
      
      if (retentionRate < 60) {
        explanations.push(`Retence klientů je ${retentionRate}% - pod průměrem.`);
      }
      
      if (explanations.length === 0) {
        explanations.push('Všechny metriky jsou v normě.');
      }

      // Generate recommended actions
      const recommendedActions: RecommendedAction[] = [];
      
      if (clientsInDebt.length > 0) {
        recommendedActions.push({
          type: 'overdue',
          label: 'Poslat upomínku dlužníkům',
          description: `${clientsInDebt.length} ${clientsInDebt.length === 1 ? 'klient má' : 'klientů má'} záporný kredit`,
          link: '/clients',
          filters: { creditStatus: 'negative' },
          count: clientsInDebt.length,
        });
      }
      
      if (clientsLowCredit.length > 3) {
        recommendedActions.push({
          type: 'low_credit',
          label: 'Připomenout dobití kreditu',
          description: `${clientsLowCredit.length} klientů má kredit ≤ 1`,
          link: '/clients',
          filters: { creditStatus: 'low' },
          count: clientsLowCredit.length,
        });
      }
      
      const inactiveClients = activeClients.filter(c => !recentClientIds.has(c.id));
      if (inactiveClients.length > 3) {
        recommendedActions.push({
          type: 'inactive',
          label: 'Oslovit neaktivní klienty',
          description: `${inactiveClients.length} klientů bez tréninku 28+ dní`,
          link: '/clients',
          filters: { activity: 'inactive' },
          count: inactiveClients.length,
        });
      }
      
      const avgCancellationRate = cancellationsTrend.length > 0 
        ? cancellationsTrend.reduce((sum, c) => sum + c.value, 0) / cancellationsTrend.length 
        : 0;
      if (avgCancellationRate > 15) {
        recommendedActions.push({
          type: 'cancellations',
          label: 'Zkontrolovat rušení tréninků',
          description: `Průměrná míra rušení: ${Math.round(avgCancellationRate)}%`,
          link: '/trainings',
          filters: { status: 'cancelled' },
        });
      }

      return {
        currentScore: totalScore,
        status,
        confidence,
        baselineWindow: baselineWeeks,
        lastComputed: now.toISOString(),
        components: {
          retention: { 
            score: Math.round(retentionScore), 
            weight: weights.retention, 
            current: retentionRate, 
            baseline: 70 
          },
          creditHealth: { 
            score: Math.round(creditScore), 
            weight: weights.creditHealth, 
            current: creditHealthRate, 
            baseline: 80 
          },
          revenueTrend: { 
            score: Math.round(revenueScore), 
            weight: weights.revenueTrend, 
            current: recentRevenue, 
            baseline: baselineRevenue 
          },
          payments: { 
            score: Math.round(paymentScore), 
            weight: weights.payments, 
            current: paidRate, 
            baseline: 90 
          },
        },
        explanations,
        revenueTrend,
        sessionsTrend,
        cancellationsTrend,
        overdueTrend,
        recommendedActions,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
