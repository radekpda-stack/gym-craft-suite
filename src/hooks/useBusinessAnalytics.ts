import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, subMonths, differenceInMonths, format, endOfMonth } from 'date-fns';

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
  activeClients30Days: number; // New: 30-day active
  newClientsCount: number; // New: first training ≤30 days ago
  churnRate: number;
  retentionRate: number;
  retentionRate30Days: number; // New: 30-day retention
  averageClientLifetimeMonths: number;
  revenuePerClient: number;
  totalRevenue: number;
  
  // Retention details
  totalClientsWithHistory: number;
  churnedClientsCount: number;
  retentionPeriodDays: number;
  avgRetention6Months: number;
  
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
       const sevenMonthsAgo = subMonths(now, 7); // Extra month for retention prev-month calc

       // Fetch ALL data in parallel - no N+1 loops
       const [
         clientsResult,
         allRecentTrainingsResult,
         revenueResult,
         lastMonthRevenueResult,
       ] = await Promise.all([
         supabase
           .from('clients')
           .select('id, created_at, is_archived')
           .eq('user_id', user.id),
         
         // Single query: all completed trainings from 7 months ago (covers income trend + retention + active clients)
         supabase
           .from('training_sessions')
           .select('id, date, client_id, final_price, status')
           .eq('user_id', user.id)
           .eq('status', 'completed')
           .gte('date', sevenMonthsAgo.toISOString()),

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
       const allRecentTrainings = allRecentTrainingsResult.data || [];
       
       // Derive this/last month trainings from the single query
       const thisMonthTrainings = allRecentTrainings.filter(t => new Date(t.date) >= thisMonthStart);
       const lastMonthTrainings = allRecentTrainings.filter(t => {
         const d = new Date(t.date);
         return d >= lastMonthStart && d < thisMonthStart;
       });
       
       // Active clients (had training in last 60 days)
       const sixtyDaysAgo = subMonths(now, 2);
       const thirtyDaysAgo = subMonths(now, 1);
       
       const recentTrainings60 = allRecentTrainings.filter(t => new Date(t.date) >= sixtyDaysAgo);
       const activeClientIds = new Set(recentTrainings60.map(t => t.client_id));
       const activeClientsCount = activeClientIds.size;

       // 30-day active clients
       const recent30Trainings = allRecentTrainings.filter(t => new Date(t.date) >= thirtyDaysAgo);
       const activeClients30Days = new Set(recent30Trainings.map(t => t.client_id)).size;

       // New clients (first training ≤30 days ago)
       const newClients = clients.filter(c => {
         const created = new Date(c.created_at);
         return created >= thirtyDaysAgo && !c.is_archived;
       });
       const newClientsCount = newClients.length;

       // Churned clients (had trainings before 60 days ago but not in last 60 days)
       const olderTrainings = allRecentTrainings.filter(t => new Date(t.date) < sixtyDaysAgo);
       const olderClientIds = new Set(olderTrainings.map(t => t.client_id));
       const churnedClients = [...olderClientIds].filter(id => !activeClientIds.has(id)).length;
       
       const totalClientsEver = new Set([...activeClientIds, ...olderClientIds]).size;
       const churnRate = totalClientsEver > 0 ? Math.round((churnedClients / totalClientsEver) * 100) : 0;
       const retentionRate = 100 - churnRate;
       
       // 30-day retention
       const retentionRate30Days = activeClientsCount > 0 
         ? Math.round((activeClients30Days / activeClientsCount) * 100)
         : retentionRate;

       // Average client lifetime
       const archivedClients = clients.filter(c => c.is_archived);
       let avgLifetime = 0;
       if (archivedClients.length > 0) {
         const lifetimes = archivedClients.map(c => differenceInMonths(now, new Date(c.created_at)));
         avgLifetime = Math.round(lifetimes.reduce((a, b) => a + b, 0) / lifetimes.length);
       } else {
         const activeLifetimes = clients.filter(c => !c.is_archived).map(c => differenceInMonths(now, new Date(c.created_at)));
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

       // Build income trend + retention trend from the single allRecentTrainings query
       const incomeTrend: IncomePoint[] = [];
       const retentionTrend: RetentionPoint[] = [];
       
       for (let i = 5; i >= 0; i--) {
         const mStart = startOfMonth(subMonths(now, i));
         const mEnd = endOfMonth(mStart);
         const prevMStart = startOfMonth(subMonths(mStart, 1));
         
         // Income for this month
         const monthTrainings = allRecentTrainings.filter(t => {
           const d = new Date(t.date);
           return d >= mStart && d <= mEnd;
         });
         const monthRevenue = monthTrainings.reduce((sum, t) => sum + (t.final_price || 0), 0);
         incomeTrend.push({
           month: format(mStart, 'MMM'),
           actual: monthRevenue,
           predicted: null,
         });

         // Retention for this month
         const monthClientIds = new Set(monthTrainings.map(t => t.client_id));
         const prevMonthTrainings = allRecentTrainings.filter(t => {
           const d = new Date(t.date);
           return d >= prevMStart && d < mStart;
         });
         const prevClientIds = new Set(prevMonthTrainings.map(t => t.client_id));
         
         const retained = [...prevClientIds].filter(id => monthClientIds.has(id)).length;
         const churned = prevClientIds.size - retained;
         const rate = prevClientIds.size > 0 ? Math.round((retained / prevClientIds.size) * 100) : 100;

         retentionTrend.push({
           month: format(mStart, 'MMM'),
           retentionRate: rate,
           activeClients: monthClientIds.size,
           churnedClients: churned,
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

      // Calculate average retention from trend
      const avgRetention6Months = retentionTrend.length > 0
        ? Math.round(retentionTrend.reduce((sum, p) => sum + p.retentionRate, 0) / retentionTrend.length)
        : 0;

      return {
        activeClientsCount,
        activeClients30Days,
        newClientsCount,
        churnRate,
        retentionRate,
        retentionRate30Days,
        averageClientLifetimeMonths: avgLifetime,
        revenuePerClient,
        totalRevenue: thisMonthRevenue,
        // Retention details
        totalClientsWithHistory: totalClientsEver,
        churnedClientsCount: churnedClients,
        retentionPeriodDays: 60,
        avgRetention6Months,
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
