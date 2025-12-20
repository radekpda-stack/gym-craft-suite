import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, subMonths, differenceInMonths, format, startOfYear, endOfMonth } from 'date-fns';

interface RetentionPoint {
  month: string;
  retentionRate: number;
  activeClients: number;
  churnedClients: number;
}

interface IncomePoint {
  month: string;
  actual: number;
  predicted: number | null;
}

interface BusinessAnalyticsData {
  // Current metrics
  activeClientsCount: number;
  churnRate: number;
  retentionRate: number;
  averageClientLifetimeMonths: number;
  revenuePerClient: number;
  totalRevenue: number;
  
  // Trends
  retentionTrend: RetentionPoint[];
  incomeTrend: IncomePoint[];
  predictedMonthlyIncome: number;
  
  // Capacity
  capacityUtilization: number;
  monthlyTrainings: number;
  avgTrainingsPerClient: number;
  
  // Comparisons
  vsLastMonth: {
    revenue: number;
    clients: number;
    trainings: number;
  };
}

export function useBusinessAnalytics() {
  return useQuery({
    queryKey: ['business-analytics'],
    queryFn: async (): Promise<BusinessAnalyticsData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const thisMonthStart = startOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const sixMonthsAgo = subMonths(now, 6);
      const yearStart = startOfYear(now);

      // Parallel queries for efficiency
      const [
        clientsResult,
        trainingsResult,
        lastMonthTrainingsResult,
        revenueResult,
        lastMonthRevenueResult,
      ] = await Promise.all([
        // All clients with creation date
        supabase
          .from('clients')
          .select('id, created_at, is_archived')
          .eq('user_id', user.id),
        
        // This month trainings
        supabase
          .from('training_sessions')
          .select('id, date, client_id, final_price, status')
          .eq('user_id', user.id)
          .gte('date', thisMonthStart.toISOString())
          .eq('status', 'completed'),
        
        // Last month trainings
        supabase
          .from('training_sessions')
          .select('id, date, client_id, final_price')
          .eq('user_id', user.id)
          .gte('date', lastMonthStart.toISOString())
          .lt('date', thisMonthStart.toISOString())
          .eq('status', 'completed'),

        // This month revenue
        supabase
          .from('training_sessions')
          .select('final_price')
          .eq('user_id', user.id)
          .gte('date', thisMonthStart.toISOString())
          .eq('status', 'completed'),
        
        // Last month revenue
        supabase
          .from('training_sessions')
          .select('final_price')
          .eq('user_id', user.id)
          .gte('date', lastMonthStart.toISOString())
          .lt('date', thisMonthStart.toISOString())
          .eq('status', 'completed'),
      ]);

      const clients = clientsResult.data || [];
      const thisMonthTrainings = trainingsResult.data || [];
      const lastMonthTrainings = lastMonthTrainingsResult.data || [];
      
      // Active clients (had training in last 60 days)
      const sixtyDaysAgo = subMonths(now, 2);
      const { data: recentTrainings } = await supabase
        .from('training_sessions')
        .select('client_id')
        .eq('user_id', user.id)
        .gte('date', sixtyDaysAgo.toISOString())
        .eq('status', 'completed');

      const activeClientIds = new Set((recentTrainings || []).map(t => t.client_id));
      const activeClientsCount = activeClientIds.size;

      // Churned clients (had trainings before but not in last 60 days)
      const { data: olderTrainings } = await supabase
        .from('training_sessions')
        .select('client_id')
        .eq('user_id', user.id)
        .lt('date', sixtyDaysAgo.toISOString())
        .eq('status', 'completed');

      const olderClientIds = new Set((olderTrainings || []).map(t => t.client_id));
      const churnedClients = [...olderClientIds].filter(id => !activeClientIds.has(id)).length;
      
      const totalClientsEver = new Set([...activeClientIds, ...olderClientIds]).size;
      const churnRate = totalClientsEver > 0 ? Math.round((churnedClients / totalClientsEver) * 100) : 0;
      const retentionRate = 100 - churnRate;

      // Average client lifetime
      const archivedClients = clients.filter(c => c.is_archived);
      let avgLifetime = 0;
      if (archivedClients.length > 0) {
        const lifetimes = archivedClients.map(c => {
          const created = new Date(c.created_at);
          return differenceInMonths(now, created);
        });
        avgLifetime = Math.round(lifetimes.reduce((a, b) => a + b, 0) / lifetimes.length);
      } else {
        // Use active clients average
        const activeLifetimes = clients.filter(c => !c.is_archived).map(c => {
          return differenceInMonths(now, new Date(c.created_at));
        });
        avgLifetime = activeLifetimes.length > 0 
          ? Math.round(activeLifetimes.reduce((a, b) => a + b, 0) / activeLifetimes.length)
          : 0;
      }

      // Revenue calculations
      const thisMonthRevenue = (revenueResult.data || [])
        .reduce((sum, t) => sum + (t.final_price || 0), 0);
      const lastMonthRevenue = (lastMonthRevenueResult.data || [])
        .reduce((sum, t) => sum + (t.final_price || 0), 0);
      
      const revenuePerClient = activeClientsCount > 0 
        ? Math.round(thisMonthRevenue / activeClientsCount)
        : 0;

      // Get 6 months of income data for trend + prediction
      const incomeTrend: IncomePoint[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(monthStart);
        
        const { data: monthData } = await supabase
          .from('training_sessions')
          .select('final_price')
          .eq('user_id', user.id)
          .gte('date', monthStart.toISOString())
          .lte('date', monthEnd.toISOString())
          .eq('status', 'completed');
        
        const monthRevenue = (monthData || []).reduce((sum, t) => sum + (t.final_price || 0), 0);
        incomeTrend.push({
          month: format(monthStart, 'MMM'),
          actual: monthRevenue,
          predicted: null,
        });
      }

      // Simple linear prediction for next 2 months
      const recentActuals = incomeTrend.map(p => p.actual);
      const avgGrowth = recentActuals.length >= 2
        ? (recentActuals[recentActuals.length - 1] - recentActuals[0]) / (recentActuals.length - 1)
        : 0;
      
      const lastActual = recentActuals[recentActuals.length - 1];
      const predicted1 = Math.max(0, Math.round(lastActual + avgGrowth));
      const predicted2 = Math.max(0, Math.round(lastActual + avgGrowth * 2));

      incomeTrend.push({
        month: format(subMonths(now, -1), 'MMM'),
        actual: 0,
        predicted: predicted1,
      });
      incomeTrend.push({
        month: format(subMonths(now, -2), 'MMM'),
        actual: 0,
        predicted: predicted2,
      });

      // Retention trend (last 6 months)
      const retentionTrend: RetentionPoint[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(monthStart);
        const prevMonthStart = startOfMonth(subMonths(monthStart, 1));
        
        const { data: monthClients } = await supabase
          .from('training_sessions')
          .select('client_id')
          .eq('user_id', user.id)
          .gte('date', monthStart.toISOString())
          .lte('date', monthEnd.toISOString())
          .eq('status', 'completed');
        
        const { data: prevMonthClients } = await supabase
          .from('training_sessions')
          .select('client_id')
          .eq('user_id', user.id)
          .gte('date', prevMonthStart.toISOString())
          .lt('date', monthStart.toISOString())
          .eq('status', 'completed');

        const monthClientIds = new Set((monthClients || []).map(t => t.client_id));
        const prevClientIds = new Set((prevMonthClients || []).map(t => t.client_id));
        
        const retained = [...prevClientIds].filter(id => monthClientIds.has(id)).length;
        const churned = prevClientIds.size - retained;
        const rate = prevClientIds.size > 0 ? Math.round((retained / prevClientIds.size) * 100) : 100;

        retentionTrend.push({
          month: format(monthStart, 'MMM'),
          retentionRate: rate,
          activeClients: monthClientIds.size,
          churnedClients: churned,
        });
      }

      // Trainings per client
      const monthlyTrainings = thisMonthTrainings.length;
      const avgTrainingsPerClient = activeClientsCount > 0
        ? Math.round((monthlyTrainings / activeClientsCount) * 10) / 10
        : 0;

      // Capacity utilization (assuming 8 hours/day, 5 days/week, 1 training = 1 hour)
      const workingDaysThisMonth = 22; // approximate
      const maxCapacity = workingDaysThisMonth * 8;
      const capacityUtilization = Math.round((monthlyTrainings / maxCapacity) * 100);

      // Month over month comparison
      const thisMonthClientIds = new Set(thisMonthTrainings.map(t => t.client_id));
      const lastMonthClientIds = new Set(lastMonthTrainings.map(t => t.client_id));

      return {
        activeClientsCount,
        churnRate,
        retentionRate,
        averageClientLifetimeMonths: avgLifetime,
        revenuePerClient,
        totalRevenue: thisMonthRevenue,
        retentionTrend,
        incomeTrend,
        predictedMonthlyIncome: predicted1,
        capacityUtilization: Math.min(100, capacityUtilization),
        monthlyTrainings,
        avgTrainingsPerClient,
        vsLastMonth: {
          revenue: lastMonthRevenue > 0 
            ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
            : 0,
          clients: lastMonthClientIds.size > 0
            ? Math.round(((thisMonthClientIds.size - lastMonthClientIds.size) / lastMonthClientIds.size) * 100)
            : 0,
          trainings: lastMonthTrainings.length > 0
            ? Math.round(((thisMonthTrainings.length - lastMonthTrainings.length) / lastMonthTrainings.length) * 100)
            : 0,
        },
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
