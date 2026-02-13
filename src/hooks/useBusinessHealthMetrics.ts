import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, subMonths, format, endOfMonth, differenceInDays } from 'date-fns';

export interface BusinessHealthMetrics {
  // Current period
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  revenueChange: number; // percentage
  
  currentMonthTrainings: number;
  previousMonthTrainings: number;
  trainingsChange: number;
  
  activeClients: number;
  previousActiveClients: number;
  clientsChange: number;
  
  retentionRate: number;
  previousRetentionRate: number;
  retentionChange: number;
  
  // Hourly rate
  currentHourlyRate: number;
  previousHourlyRate: number;
  hourlyRateChange: number;
  
  // Capacity
  capacityUtilization: number;
  
  // Revenue per client
  revenuePerClient: number;
  previousRevenuePerClient: number;
  revenuePerClientChange: number;
  
  // Annual projection
  annualProjection: number;
  
  // Expenses & profit
  currentMonthExpenses: number;
  currentMonthProfit: number;
  profitMargin: number;
  
  // Sparkline data (last 6 months)
  revenueSpark: number[];
  trainingsSpark: number[];
  clientsSpark: number[];
}

export function useBusinessHealthMetrics() {
  return useQuery({
    queryKey: ['business-health-metrics'],
    queryFn: async (): Promise<BusinessHealthMetrics> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const months: { start: Date; end: Date }[] = [];
      for (let i = 5; i >= 0; i--) {
        const s = startOfMonth(subMonths(now, i));
        months.push({ start: s, end: endOfMonth(s) });
      }

      // Fetch 6 months of trainings + expenses in parallel
      const [trainingsRes, expensesRes, clientsRes] = await Promise.all([
        supabase
          .from('training_sessions')
          .select('id, date, client_id, final_price, status, duration')
          .eq('user_id', user.id)
          .gte('date', months[0].start.toISOString())
          .eq('status', 'completed'),
        supabase
          .from('business_expenses')
          .select('amount, date')
          .eq('user_id', user.id)
          .gte('date', format(months[0].start, 'yyyy-MM-dd')),
        supabase
          .from('clients')
          .select('id, is_archived')
          .eq('user_id', user.id)
          .eq('is_archived', false),
      ]);

      const trainings = trainingsRes.data || [];
      const expenses = expensesRes.data || [];
      const activeClientsTotal = (clientsRes.data || []).length;

      // Group trainings by month
      const monthlyData = months.map(m => {
        const mKey = format(m.start, 'yyyy-MM');
        const mTrainings = trainings.filter(t => format(new Date(t.date), 'yyyy-MM') === mKey);
        const mExpenses = expenses.filter(e => format(new Date(e.date), 'yyyy-MM') === mKey);
        const revenue = mTrainings.reduce((s, t) => s + (t.final_price || 0), 0);
        const expenseTotal = mExpenses.reduce((s, e) => s + e.amount, 0);
        const clientIds = new Set(mTrainings.map(t => t.client_id));
        const hours = mTrainings.reduce((sum, t) => sum + ((t.duration || 60) / 60), 0);
        const hourlyRate = hours > 0 ? revenue / hours : 0;
        
        return {
          month: mKey,
          revenue,
          trainings: mTrainings.length,
          clients: clientIds.size,
          expenses: expenseTotal,
          profit: revenue - expenseTotal,
          hourlyRate,
          clientIds,
        };
      });

      const curr = monthlyData[5]; // current month
      const prev = monthlyData[4]; // previous month

      const pct = (a: number, b: number) => b > 0 ? Math.round(((a - b) / b) * 100) : 0;

      // Retention: how many of prev month's clients are still in current month
      const retainedClients = prev.clientIds.size > 0
        ? [...prev.clientIds].filter(id => curr.clientIds.has(id)).length
        : 0;
      const retentionRate = prev.clientIds.size > 0
        ? Math.round((retainedClients / prev.clientIds.size) * 100)
        : 100;

      // Previous retention (month -2 to -1)
      const prevPrev = monthlyData[3];
      const prevRetained = prevPrev.clientIds.size > 0
        ? [...prevPrev.clientIds].filter(id => prev.clientIds.has(id)).length
        : 0;
      const previousRetentionRate = prevPrev.clientIds.size > 0
        ? Math.round((prevRetained / prevPrev.clientIds.size) * 100)
        : 100;

      // Capacity: assume 22 working days * 8 sessions max
      const maxCapacity = 22 * 8;
      const capacityUtilization = Math.min(100, Math.round((curr.trainings / maxCapacity) * 100));

      // Revenue per client
      const revenuePerClient = curr.clients > 0 ? Math.round(curr.revenue / curr.clients) : 0;
      const prevRevenuePerClient = prev.clients > 0 ? Math.round(prev.revenue / prev.clients) : 0;

      // Annual projection based on last 3 months avg
      const last3Avg = (monthlyData[3].revenue + monthlyData[4].revenue + monthlyData[5].revenue) / 3;
      const annualProjection = Math.round(last3Avg * 12);

      return {
        currentMonthRevenue: curr.revenue,
        previousMonthRevenue: prev.revenue,
        revenueChange: pct(curr.revenue, prev.revenue),
        currentMonthTrainings: curr.trainings,
        previousMonthTrainings: prev.trainings,
        trainingsChange: pct(curr.trainings, prev.trainings),
        activeClients: curr.clients || activeClientsTotal,
        previousActiveClients: prev.clients,
        clientsChange: pct(curr.clients, prev.clients),
        retentionRate,
        previousRetentionRate,
        retentionChange: retentionRate - previousRetentionRate,
        currentHourlyRate: Math.round(curr.hourlyRate),
        previousHourlyRate: Math.round(prev.hourlyRate),
        hourlyRateChange: pct(curr.hourlyRate, prev.hourlyRate),
        capacityUtilization,
        revenuePerClient,
        previousRevenuePerClient: prevRevenuePerClient,
        revenuePerClientChange: pct(revenuePerClient, prevRevenuePerClient),
        annualProjection,
        currentMonthExpenses: curr.expenses,
        currentMonthProfit: curr.profit,
        profitMargin: curr.revenue > 0 ? Math.round((curr.profit / curr.revenue) * 100) : 0,
        revenueSpark: monthlyData.map(m => m.revenue),
        trainingsSpark: monthlyData.map(m => m.trainings),
        clientsSpark: monthlyData.map(m => m.clients),
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
