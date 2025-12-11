import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth } from 'date-fns';

interface DashboardKPIs {
  incomeThisMonth: number;
  incomeTrend: number;
  netProfitThisMonth: number;
  profitTrend: number;
  trainingsThisMonth: number;
  trainingsTrend: number;
  activeClients: number;
  lateCancellations: number;
  unpaidCount: number;
  unpaidAmount: number;
}

export function useDashboardKPIs() {
  return useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const now = new Date();
      const currentMonthStart = startOfMonth(now);
      const currentMonthEnd = endOfMonth(now);
      
      const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const lastMonthEnd = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));

      // Fetch current month transactions
      const { data: currentTransactions } = await supabase
        .from('credit_transactions')
        .select('amount, type, product_id, products(purchase_price)')
        .gte('created_at', currentMonthStart.toISOString())
        .lte('created_at', currentMonthEnd.toISOString());

      // Fetch last month transactions
      const { data: lastTransactions } = await supabase
        .from('credit_transactions')
        .select('amount, type, product_id, products(purchase_price)')
        .gte('created_at', lastMonthStart.toISOString())
        .lte('created_at', lastMonthEnd.toISOString());

      // Calculate income and profit
      let currentIncome = 0;
      let currentCosts = 0;
      let lastIncome = 0;
      let lastCosts = 0;

      currentTransactions?.forEach((t: any) => {
        if (t.type === 'payment' && t.amount > 0) {
          currentIncome += t.amount;
        }
        if (t.product_id && t.products?.purchase_price) {
          currentCosts += t.products.purchase_price;
        }
      });

      lastTransactions?.forEach((t: any) => {
        if (t.type === 'payment' && t.amount > 0) {
          lastIncome += t.amount;
        }
        if (t.product_id && t.products?.purchase_price) {
          lastCosts += t.products.purchase_price;
        }
      });

      const incomeTrend = lastIncome > 0 ? ((currentIncome - lastIncome) / lastIncome) * 100 : 0;
      const currentProfit = currentIncome - currentCosts;
      const lastProfit = lastIncome - lastCosts;
      const profitTrend = lastProfit > 0 ? ((currentProfit - lastProfit) / lastProfit) * 100 : 0;

      // Fetch current month trainings
      const { count: currentTrainings } = await supabase
        .from('training_sessions')
        .select('id', { count: 'exact' })
        .eq('status', 'completed')
        .gte('date', currentMonthStart.toISOString())
        .lte('date', currentMonthEnd.toISOString());

      // Fetch last month trainings
      const { count: lastTrainings } = await supabase
        .from('training_sessions')
        .select('id', { count: 'exact' })
        .eq('status', 'completed')
        .gte('date', lastMonthStart.toISOString())
        .lte('date', lastMonthEnd.toISOString());

      const trainingsTrend = (lastTrainings || 0) > 0 
        ? (((currentTrainings || 0) - (lastTrainings || 0)) / (lastTrainings || 1)) * 100 
        : 0;

      // Fetch active clients (had training in last 30 days)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const { data: recentSessions } = await supabase
        .from('training_sessions')
        .select('client_id')
        .gte('date', thirtyDaysAgo.toISOString());

      const activeClientIds = new Set(recentSessions?.map((s) => s.client_id) || []);

      // Fetch late cancellations this month
      const { count: lateCancellations } = await supabase
        .from('training_sessions')
        .select('id', { count: 'exact' })
        .eq('status', 'canceled')
        .eq('is_late_cancellation', true)
        .gte('canceled_at', currentMonthStart.toISOString())
        .lte('canceled_at', currentMonthEnd.toISOString());

      // Fetch unpaid trainings
      const { data: unpaidTrainings } = await supabase
        .from('training_sessions')
        .select('final_price')
        .eq('payment_status', 'pending')
        .eq('status', 'completed');

      const unpaidCount = unpaidTrainings?.length || 0;
      const unpaidAmount = unpaidTrainings?.reduce((sum, t) => sum + (t.final_price || 0), 0) || 0;

      return {
        incomeThisMonth: currentIncome,
        incomeTrend,
        netProfitThisMonth: currentProfit,
        profitTrend,
        trainingsThisMonth: currentTrainings || 0,
        trainingsTrend,
        activeClients: activeClientIds.size,
        lateCancellations: lateCancellations || 0,
        unpaidCount,
        unpaidAmount,
      } as DashboardKPIs;
    },
  });
}
