import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';
import type { StatsPeriodRange } from '@/components/statistics/StatsPeriodSelector';

export interface ClientAtRisk {
  id: string;
  name: string;
  reason: string;
  detail: string;
  severity: 'warning' | 'critical';
}

export interface ClientHealthData {
  // Activity metrics
  activeClients: number;
  inactiveClients: number;
  newClientsThisMonth: number;
  
  // Retention
  retentionRate: number;
  retentionTrend: number; // vs previous period
  
  // Value
  avgLTV: number;
  avgMonthlyValue: number;
  topClient: { name: string; value: number } | null;
  
  // At-risk clients
  clientsAtRisk: ClientAtRisk[];
}

export function useClientHealthSummary(periodRange: StatsPeriodRange | undefined) {
  return useQuery({
    queryKey: ['client-health-summary', periodRange?.start?.toISOString(), periodRange?.end?.toISOString()],
    queryFn: async (): Promise<ClientHealthData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const thirtyDaysAgo = subDays(now, 30);
      const sixtyDaysAgo = subDays(now, 60);

      // Fetch all necessary data
      const [clientsResult, recentTrainingsResult, olderTrainingsResult, transactionsResult] = await Promise.all([
        // All clients
        supabase
          .from('clients')
          .select('id, name, credit_balance, is_archived, created_at')
          .eq('user_id', user.id)
          .eq('is_system', false),
        
        // Recent trainings (30 days)
        supabase
          .from('training_sessions')
          .select('client_id, final_price, date')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('date', format(thirtyDaysAgo, 'yyyy-MM-dd')),
        
        // Older trainings (31-60 days ago)
        supabase
          .from('training_sessions')
          .select('client_id')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('date', format(sixtyDaysAgo, 'yyyy-MM-dd'))
          .lt('date', format(thirtyDaysAgo, 'yyyy-MM-dd')),
        
        // All income transactions for LTV
        supabase
          .from('credit_transactions')
          .select('client_id, amount, type')
          .eq('user_id', user.id)
          .in('type', ['training', 'canceled_training', 'product']),
      ]);

      const clients = clientsResult.data || [];
      const recentTrainings = recentTrainingsResult.data || [];
      const olderTrainings = olderTrainingsResult.data || [];
      const transactions = transactionsResult.data || [];

      // Active clients (had training in last 30 days)
      const activeClientIds = new Set(recentTrainings.map(t => t.client_id));
      const activeClients = activeClientIds.size;

      // Previously active clients (had training 31-60 days ago)
      const previouslyActiveIds = new Set(olderTrainings.map(t => t.client_id));

      // Inactive = not archived but no recent training
      const nonArchivedClients = clients.filter(c => !c.is_archived);
      const inactiveClients = nonArchivedClients.filter(c => !activeClientIds.has(c.id)).length;

      // New clients this month
      const newClientsThisMonth = clients.filter(c => {
        const created = new Date(c.created_at);
        return created >= thirtyDaysAgo && !c.is_archived;
      }).length;

      // Retention: clients active now who were also active before
      const retained = [...previouslyActiveIds].filter(id => activeClientIds.has(id)).length;
      const retentionRate = previouslyActiveIds.size > 0 
        ? Math.round((retained / previouslyActiveIds.size) * 100) 
        : 100;

      // Calculate LTV per client
      const ltvByClient: Record<string, number> = {};
      transactions.forEach(t => {
        if (!ltvByClient[t.client_id]) ltvByClient[t.client_id] = 0;
        ltvByClient[t.client_id] += Math.abs(t.amount);
      });

      const ltvValues = Object.values(ltvByClient);
      const avgLTV = ltvValues.length > 0 
        ? Math.round(ltvValues.reduce((a, b) => a + b, 0) / ltvValues.length)
        : 0;

      // Monthly value (this month's income / active clients)
      const thisMonthIncome = recentTrainings.reduce((sum, t) => sum + (t.final_price || 0), 0);
      const avgMonthlyValue = activeClients > 0 ? Math.round(thisMonthIncome / activeClients) : 0;

      // Top client by LTV
      const clientNameMap = new Map(clients.map(c => [c.id, c.name]));
      const topClientEntry = Object.entries(ltvByClient).sort(([, a], [, b]) => b - a)[0];
      const topClient = topClientEntry 
        ? { name: clientNameMap.get(topClientEntry[0]) || 'Neznámý', value: topClientEntry[1] }
        : null;

      // Clients at risk
      const clientsAtRisk: ClientAtRisk[] = [];

      // Training frequency by client (last 60 days)
      const trainingsPerClient: Record<string, number[]> = {};
      [...recentTrainings, ...olderTrainings.map(t => ({ ...t, date: format(sixtyDaysAgo, 'yyyy-MM-dd') }))].forEach(t => {
        if (!trainingsPerClient[t.client_id]) trainingsPerClient[t.client_id] = [];
        trainingsPerClient[t.client_id].push(1);
      });

      // Detect at-risk clients
      nonArchivedClients.forEach(client => {
        // Negative credit balance
        if (client.credit_balance < 0) {
          clientsAtRisk.push({
            id: client.id,
            name: client.name,
            reason: 'Záporný kredit',
            detail: `${client.credit_balance} Kč`,
            severity: client.credit_balance < -1000 ? 'critical' : 'warning',
          });
        }

        // Was active before but not now
        if (previouslyActiveIds.has(client.id) && !activeClientIds.has(client.id)) {
          clientsAtRisk.push({
            id: client.id,
            name: client.name,
            reason: 'Pokles aktivity',
            detail: 'Netrénoval/a 30+ dní',
            severity: 'warning',
          });
        }
      });

      // Sort by severity
      clientsAtRisk.sort((a, b) => {
        if (a.severity === 'critical' && b.severity !== 'critical') return -1;
        if (a.severity !== 'critical' && b.severity === 'critical') return 1;
        return 0;
      });

      return {
        activeClients,
        inactiveClients,
        newClientsThisMonth,
        retentionRate,
        retentionTrend: 0, // Would need historical data
        avgLTV,
        avgMonthlyValue,
        topClient,
        clientsAtRisk: clientsAtRisk.slice(0, 5),
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
