import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDemoMode } from '@/contexts/DemoContext';
import { differenceInDays, subMonths, startOfMonth } from 'date-fns';

export type ChurnRiskLevel = 'high' | 'medium' | 'low';

export interface ChurnRiskClient {
  id: string;
  name: string;
  riskLevel: ChurnRiskLevel;
  riskScore: number; // 0-100
  riskFactors: {
    label: string;
    severity: 'high' | 'medium' | 'low';
  }[];
  recommendedAction: string;
  daysSinceLastTraining: number | null;
  frequencyChange: number; // percentage change
  unpaidAmount: number;
  unpaidDays: number;
  cancelRate: number;
  avgBodyFeel: number | null;
}

export interface ChurnRiskData {
  clients: ChurnRiskClient[];
  summary: {
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    totalAtRisk: number;
    potentialRevenueLoss: number;
  };
}

// Churn risk rules with weights
const CHURN_RULES = {
  frequencyDrop50: { weight: 2, label: 'Pokles frekvence >50%', severity: 'high' as const },
  unpaid14Days: { weight: 2, label: 'Nezaplaceno >14 dní', severity: 'high' as const },
  highCancelRate: { weight: 1, label: 'Vysoká míra zrušení', severity: 'medium' as const },
  decliningBodyFeel: { weight: 1, label: 'Klesající spokojenost', severity: 'medium' as const },
  longPause: { weight: 1, label: 'Dlouhá pauza', severity: 'medium' as const },
};

// Demo data
const generateDemoChurnData = (): ChurnRiskData => {
  const demoClients: ChurnRiskClient[] = [
    {
      id: '1',
      name: 'Jan Novák',
      riskLevel: 'high',
      riskScore: 85,
      riskFactors: [
        { label: 'Pokles frekvence >50%', severity: 'high' },
        { label: 'Nezaplaceno >14 dní', severity: 'high' },
        { label: 'Dlouhá pauza', severity: 'medium' },
      ],
      recommendedAction: 'Kontaktovat klienta a nabídnout individuální plán',
      daysSinceLastTraining: 25,
      frequencyChange: -65,
      unpaidAmount: 2400,
      unpaidDays: 21,
      cancelRate: 15,
      avgBodyFeel: 3.2,
    },
    {
      id: '2',
      name: 'Marie Svobodová',
      riskLevel: 'high',
      riskScore: 72,
      riskFactors: [
        { label: 'Vysoká míra zrušení', severity: 'medium' },
        { label: 'Nezaplaceno >14 dní', severity: 'high' },
      ],
      recommendedAction: 'Zjistit důvod častého rušení a řešit platbu',
      daysSinceLastTraining: 8,
      frequencyChange: -30,
      unpaidAmount: 1600,
      unpaidDays: 18,
      cancelRate: 45,
      avgBodyFeel: 4.0,
    },
    {
      id: '3',
      name: 'Petr Dvořák',
      riskLevel: 'medium',
      riskScore: 55,
      riskFactors: [
        { label: 'Klesající spokojenost', severity: 'medium' },
        { label: 'Pokles frekvence >50%', severity: 'high' },
      ],
      recommendedAction: 'Konzultace o programu a cílech',
      daysSinceLastTraining: 12,
      frequencyChange: -55,
      unpaidAmount: 0,
      unpaidDays: 0,
      cancelRate: 10,
      avgBodyFeel: 2.8,
    },
  ];

  return {
    clients: demoClients,
    summary: {
      highRisk: 2,
      mediumRisk: 1,
      lowRisk: 0,
      totalAtRisk: 3,
      potentialRevenueLoss: 15000,
    },
  };
};

export function useChurnRisk() {
  const { isDemo } = useDemoMode();

  return useQuery({
    queryKey: ['churn-risk', isDemo],
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<ChurnRiskData> => {
      if (isDemo) {
        return generateDemoChurnData();
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const thirtyDaysAgo = subMonths(now, 1);
      const sixtyDaysAgo = subMonths(now, 2);
      const thisMonthStart = startOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));

      // Fetch all necessary data in parallel
      const [clientsResult, sessionsResult, transactionsResult, feedbackResult] = await Promise.all([
        supabase
          .from('clients')
          .select('id, name, is_archived, credit_balance')
          .eq('user_id', user.id)
          .eq('is_archived', false)
          .eq('is_system', false),
        
        supabase
          .from('training_sessions')
          .select('id, client_id, date, status, final_price, payment_status')
          .eq('user_id', user.id)
          .gte('date', sixtyDaysAgo.toISOString()),
        
        supabase
          .from('credit_transactions')
          .select('client_id, amount, type, created_at')
          .eq('user_id', user.id)
          .eq('type', 'training')
          .lt('amount', 0),
        
        supabase
          .from('training_feedback')
          .select('client_id, body_feel, created_at')
          .gte('created_at', sixtyDaysAgo.toISOString()),
      ]);

      const clients = clientsResult.data || [];
      const sessions = sessionsResult.data || [];
      const transactions = transactionsResult.data || [];
      const feedback = feedbackResult.data || [];

      const churnClients: ChurnRiskClient[] = [];

      for (const client of clients) {
        const clientSessions = sessions.filter(s => s.client_id === client.id);
        const completedSessions = clientSessions.filter(s => s.status === 'completed');
        const cancelledSessions = clientSessions.filter(s => s.status === 'canceled');
        
        // Calculate metrics
        const lastSession = completedSessions
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const daysSinceLastTraining = lastSession 
          ? differenceInDays(now, new Date(lastSession.date))
          : null;

        // Frequency comparison
        const thisMonthCount = completedSessions.filter(s => new Date(s.date) >= thisMonthStart).length;
        const lastMonthCount = completedSessions.filter(s => {
          const d = new Date(s.date);
          return d >= lastMonthStart && d < thisMonthStart;
        }).length;
        const frequencyChange = lastMonthCount > 0 
          ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100)
          : 0;

        // Unpaid trainings
        const unpaidSessions = clientSessions.filter(s => 
          s.status === 'completed' && s.payment_status !== 'paid'
        );
        const unpaidAmount = unpaidSessions.reduce((sum, s) => sum + (s.final_price || 0), 0);
        const oldestUnpaid = unpaidSessions
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
        const unpaidDays = oldestUnpaid 
          ? differenceInDays(now, new Date(oldestUnpaid.date))
          : 0;

        // Cancel rate
        const totalAttempts = completedSessions.length + cancelledSessions.length;
        const cancelRate = totalAttempts > 0 
          ? Math.round((cancelledSessions.length / totalAttempts) * 100)
          : 0;

        // Body feel trend
        const clientFeedback = feedback.filter(f => f.client_id === client.id);
        const avgBodyFeel = clientFeedback.length > 0
          ? clientFeedback.reduce((sum, f) => sum + (f.body_feel || 0), 0) / clientFeedback.length
          : null;

        // Apply churn rules
        const riskFactors: ChurnRiskClient['riskFactors'] = [];
        let totalWeight = 0;

        // Rule 1: Frequency drop >50%
        if (frequencyChange <= -50) {
          riskFactors.push({ label: CHURN_RULES.frequencyDrop50.label, severity: CHURN_RULES.frequencyDrop50.severity });
          totalWeight += CHURN_RULES.frequencyDrop50.weight;
        }

        // Rule 2: Unpaid >14 days
        if (unpaidDays > 14) {
          riskFactors.push({ label: CHURN_RULES.unpaid14Days.label, severity: CHURN_RULES.unpaid14Days.severity });
          totalWeight += CHURN_RULES.unpaid14Days.weight;
        }

        // Rule 3: High cancel rate (>30%)
        if (cancelRate > 30) {
          riskFactors.push({ label: CHURN_RULES.highCancelRate.label, severity: CHURN_RULES.highCancelRate.severity });
          totalWeight += CHURN_RULES.highCancelRate.weight;
        }

        // Rule 4: Declining body feel (<3.5)
        if (avgBodyFeel !== null && avgBodyFeel < 3.5) {
          riskFactors.push({ label: CHURN_RULES.decliningBodyFeel.label, severity: CHURN_RULES.decliningBodyFeel.severity });
          totalWeight += CHURN_RULES.decliningBodyFeel.weight;
        }

        // Rule 5: Long pause (>14 days)
        if (daysSinceLastTraining !== null && daysSinceLastTraining > 14) {
          riskFactors.push({ label: CHURN_RULES.longPause.label, severity: CHURN_RULES.longPause.severity });
          totalWeight += CHURN_RULES.longPause.weight;
        }

        // Client is at risk if weight >= 3 (at least 2 risk factors)
        if (totalWeight >= 3) {
          const riskScore = Math.min(100, totalWeight * 20 + 20);
          const riskLevel: ChurnRiskLevel = riskScore >= 70 ? 'high' : riskScore >= 50 ? 'medium' : 'low';

          // Generate recommended action
          let recommendedAction = 'Kontaktovat klienta';
          if (unpaidDays > 14) {
            recommendedAction = 'Vyřešit nezaplacenou částku a zjistit důvod';
          } else if (frequencyChange <= -50) {
            recommendedAction = 'Nabídnout motivační balíček nebo konzultaci';
          } else if (cancelRate > 30) {
            recommendedAction = 'Zjistit důvod častého rušení tréninků';
          }

          churnClients.push({
            id: client.id,
            name: client.name,
            riskLevel,
            riskScore,
            riskFactors,
            recommendedAction,
            daysSinceLastTraining,
            frequencyChange,
            unpaidAmount,
            unpaidDays,
            cancelRate,
            avgBodyFeel,
          });
        }
      }

      // Sort by risk score descending
      churnClients.sort((a, b) => b.riskScore - a.riskScore);

      // Calculate summary
      const highRisk = churnClients.filter(c => c.riskLevel === 'high').length;
      const mediumRisk = churnClients.filter(c => c.riskLevel === 'medium').length;
      const lowRisk = churnClients.filter(c => c.riskLevel === 'low').length;
      
      // Estimate potential revenue loss (avg 4 trainings/month * avg price * 3 months)
      const avgPricePerTraining = sessions.length > 0
        ? sessions.reduce((sum, s) => sum + (s.final_price || 0), 0) / sessions.length
        : 800;
      const potentialRevenueLoss = churnClients.length * avgPricePerTraining * 4 * 3;

      return {
        clients: churnClients.slice(0, 10), // Top 10
        summary: {
          highRisk,
          mediumRisk,
          lowRisk,
          totalAtRisk: churnClients.length,
          potentialRevenueLoss: Math.round(potentialRevenueLoss),
        },
      };
    },
  });
}
