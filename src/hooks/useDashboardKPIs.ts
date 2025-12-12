import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, startOfYear, differenceInDays } from 'date-fns';

interface DashboardKPIs {
  // Income
  incomeThisMonth: number;
  incomeLastMonth: number;
  avgMonthlyIncome: number;
  trainingIncome: number;
  productIncome: number;
  incomeTrend: number;
  
  // Profit
  netProfitThisMonth: number;
  expensesThisMonth: number;
  profitMargin: number;
  profitTrend: number;
  
  // Trainings
  trainingsThisMonth: number;
  trainingsLastMonth: number;
  trainingsThisYear: number;
  avgParticipants: number;
  trainingsTrend: number;
  
  // Clients
  activeClients: number;
  totalClients: number;
  newClientsThisMonth: number;
  lowCreditClients: number;
  archivedClients: number;
  
  // Cancellations
  lateCancellations: number;
  lateCancellationsLastMonth: number;
  totalCancellations: number;
  cancellationRate: number;
  cancellationLoss: number;
  
  // Unpaid
  unpaidCount: number;
  unpaidAmount: number;
  unpaidClientsCount: number;
  avgUnpaidPerClient: number;
  oldestUnpaidDays: number | null;
}

export function useDashboardKPIs() {
  return useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const now = new Date();
      const currentMonthStart = startOfMonth(now);
      const currentMonthEnd = endOfMonth(now);
      const yearStart = startOfYear(now);
      
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

      // Fetch all transactions for average calculation
      const { data: allTransactions } = await supabase
        .from('credit_transactions')
        .select('amount, type, created_at')
        .eq('type', 'payment')
        .gt('amount', 0);

      // Calculate income and profit
      let currentIncome = 0;
      let currentCosts = 0;
      let currentTrainingIncome = 0;
      let currentProductIncome = 0;
      let lastIncome = 0;
      let lastCosts = 0;

      currentTransactions?.forEach((t: any) => {
        if (t.type === 'payment' && t.amount > 0) {
          currentIncome += t.amount;
          if (t.product_id) {
            currentProductIncome += t.amount;
          } else {
            currentTrainingIncome += t.amount;
          }
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

      // Calculate average monthly income
      const monthlyIncomes: Record<string, number> = {};
      allTransactions?.forEach((t: any) => {
        const month = t.created_at.substring(0, 7);
        monthlyIncomes[month] = (monthlyIncomes[month] || 0) + t.amount;
      });
      const monthCount = Object.keys(monthlyIncomes).length || 1;
      const avgMonthlyIncome = Object.values(monthlyIncomes).reduce((a, b) => a + b, 0) / monthCount;

      const incomeTrend = lastIncome > 0 ? ((currentIncome - lastIncome) / lastIncome) * 100 : 0;
      const currentProfit = currentIncome - currentCosts;
      const lastProfit = lastIncome - lastCosts;
      const profitTrend = lastProfit > 0 ? ((currentProfit - lastProfit) / lastProfit) * 100 : 0;
      const profitMargin = currentIncome > 0 ? (currentProfit / currentIncome) * 100 : 0;

      // Fetch current month trainings
      const { data: currentTrainingData } = await supabase
        .from('training_sessions')
        .select('id, participant_count')
        .eq('status', 'completed')
        .gte('date', currentMonthStart.toISOString())
        .lte('date', currentMonthEnd.toISOString());

      const currentTrainings = currentTrainingData?.length || 0;
      const avgParticipants = currentTrainings > 0
        ? (currentTrainingData?.reduce((sum, t) => sum + (t.participant_count || 1), 0) || 0) / currentTrainings
        : 1;

      // Fetch last month trainings
      const { count: lastTrainings } = await supabase
        .from('training_sessions')
        .select('id', { count: 'exact' })
        .eq('status', 'completed')
        .gte('date', lastMonthStart.toISOString())
        .lte('date', lastMonthEnd.toISOString());

      // Fetch year trainings
      const { count: yearTrainings } = await supabase
        .from('training_sessions')
        .select('id', { count: 'exact' })
        .eq('status', 'completed')
        .gte('date', yearStart.toISOString());

      const trainingsTrend = (lastTrainings || 0) > 0 
        ? ((currentTrainings - (lastTrainings || 0)) / (lastTrainings || 1)) * 100 
        : 0;

      // Fetch active clients (had training in last 30 days)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const { data: recentSessions } = await supabase
        .from('training_sessions')
        .select('client_id')
        .gte('date', thirtyDaysAgo.toISOString());

      const activeClientIds = new Set(recentSessions?.map((s) => s.client_id) || []);

      // Fetch all clients for stats
      const { data: allClients } = await supabase
        .from('clients')
        .select('id, is_archived, credit_balance, created_at');

      const totalClients = allClients?.filter(c => !c.is_archived).length || 0;
      const archivedClients = allClients?.filter(c => c.is_archived).length || 0;
      const newClientsThisMonth = allClients?.filter(c => 
        new Date(c.created_at) >= currentMonthStart && new Date(c.created_at) <= currentMonthEnd
      ).length || 0;
      const lowCreditClients = allClients?.filter(c => 
        !c.is_archived && (c.credit_balance || 0) < 800 && (c.credit_balance || 0) > 0
      ).length || 0;

      // Fetch late cancellations this month
      const { count: lateCancellations } = await supabase
        .from('training_sessions')
        .select('id', { count: 'exact' })
        .eq('status', 'canceled')
        .eq('is_late_cancellation', true)
        .gte('canceled_at', currentMonthStart.toISOString())
        .lte('canceled_at', currentMonthEnd.toISOString());

      // Fetch late cancellations last month
      const { count: lateCancellationsLastMonth } = await supabase
        .from('training_sessions')
        .select('id', { count: 'exact' })
        .eq('status', 'canceled')
        .eq('is_late_cancellation', true)
        .gte('canceled_at', lastMonthStart.toISOString())
        .lte('canceled_at', lastMonthEnd.toISOString());

      // Fetch total cancellations this month
      const { data: cancelledTrainings } = await supabase
        .from('training_sessions')
        .select('id, final_price')
        .eq('status', 'canceled')
        .gte('canceled_at', currentMonthStart.toISOString())
        .lte('canceled_at', currentMonthEnd.toISOString());

      const totalCancellations = cancelledTrainings?.length || 0;
      const cancellationLoss = cancelledTrainings?.reduce((sum, t) => sum + (t.final_price || 0), 0) || 0;

      // Fetch all scheduled trainings this month for rate calculation
      const { count: allScheduledThisMonth } = await supabase
        .from('training_sessions')
        .select('id', { count: 'exact' })
        .gte('date', currentMonthStart.toISOString())
        .lte('date', currentMonthEnd.toISOString());

      const cancellationRate = (allScheduledThisMonth || 0) > 0 
        ? (totalCancellations / (allScheduledThisMonth || 1)) * 100 
        : 0;

      // Fetch unpaid trainings
      const { data: unpaidTrainings } = await supabase
        .from('training_sessions')
        .select('final_price, client_id, date')
        .eq('payment_status', 'pending')
        .eq('status', 'completed')
        .order('date', { ascending: true });

      const unpaidCount = unpaidTrainings?.length || 0;
      const unpaidAmount = unpaidTrainings?.reduce((sum, t) => sum + (t.final_price || 0), 0) || 0;
      const unpaidClientIds = new Set(unpaidTrainings?.map(t => t.client_id) || []);
      const unpaidClientsCount = unpaidClientIds.size;
      const avgUnpaidPerClient = unpaidClientsCount > 0 ? unpaidAmount / unpaidClientsCount : 0;
      const oldestUnpaidDays = unpaidTrainings?.length 
        ? differenceInDays(now, new Date(unpaidTrainings[0].date))
        : null;

      return {
        // Income
        incomeThisMonth: currentIncome,
        incomeLastMonth: lastIncome,
        avgMonthlyIncome,
        trainingIncome: currentTrainingIncome,
        productIncome: currentProductIncome,
        incomeTrend,
        
        // Profit
        netProfitThisMonth: currentProfit,
        expensesThisMonth: currentCosts,
        profitMargin,
        profitTrend,
        
        // Trainings
        trainingsThisMonth: currentTrainings,
        trainingsLastMonth: lastTrainings || 0,
        trainingsThisYear: yearTrainings || 0,
        avgParticipants,
        trainingsTrend,
        
        // Clients
        activeClients: activeClientIds.size,
        totalClients,
        newClientsThisMonth,
        lowCreditClients,
        archivedClients,
        
        // Cancellations
        lateCancellations: lateCancellations || 0,
        lateCancellationsLastMonth: lateCancellationsLastMonth || 0,
        totalCancellations,
        cancellationRate,
        cancellationLoss,
        
        // Unpaid
        unpaidCount,
        unpaidAmount,
        unpaidClientsCount,
        avgUnpaidPerClient,
        oldestUnpaidDays,
      } as DashboardKPIs;
    },
  });
}
