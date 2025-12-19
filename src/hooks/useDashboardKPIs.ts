import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, startOfYear, differenceInDays, subMonths } from 'date-fns';
import { useDashboardFilters, AccountingMode, PaymentStatusFilter, DateRange } from '@/contexts/DashboardFiltersContext';

export interface UnpaidByAge {
  days0to7: { count: number; amount: number };
  days8to30: { count: number; amount: number };
  days31plus: { count: number; amount: number };
}

export interface DashboardKPIs {
  // Income (from trainings only)
  incomeThisMonth: number;
  incomeLastMonth: number;
  avgMonthlyIncome: number;
  trainingIncome: number;
  trainingIncomeLastMonth: number;
  trainingIncomeTrend: number;
  productIncome: number;
  incomeTrend: number;
  
  // Credit received (dobití kreditu)
  creditReceived: number;
  creditReceivedLastMonth: number;
  creditReceivedTrend: number;
  
  // New KPIs
  incomePerTraining: number;
  productIncomeShare: number;
  unpaidByAge: UnpaidByAge;
  
  // Product specific
  productCost: number;
  productProfit: number;
  productMargin: number;
  productSalesCount: number;
  
  // Profit (total)
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
  
  // Metadata
  accountingMode: AccountingMode;
  itemsWithoutPaymentDate: number;
}

// Helper to get the appropriate date field based on accounting mode
function getDateFieldForMode(mode: AccountingMode): string {
  // CASH = payment date (created_at for transactions)
  // ACCRUAL = service date (date for trainings, created_at for transactions which is when sold)
  return 'created_at'; // Both use created_at for transactions, difference is in how we handle trainings
}

export function useDashboardKPIs() {
  const { filters } = useDashboardFilters();
  const { dateRange, accountingMode, paymentStatus, clientIds } = filters;

  // Memoize date strings to prevent re-renders
  const dateFromStr = useMemo(() => dateRange.from.toISOString(), [dateRange.from.getTime()]);
  const dateToStr = useMemo(() => dateRange.to.toISOString(), [dateRange.to.getTime()]);
  const clientIdsKey = useMemo(() => clientIds.join(','), [clientIds]);

  return useQuery({
    queryKey: ['dashboard-kpis', dateFromStr, dateToStr, accountingMode, paymentStatus, clientIdsKey],
    queryFn: async () => {
      const now = new Date();
      const periodStart = dateRange.from;
      const periodEnd = dateRange.to;
      
      // Calculate comparison period (same length, immediately before)
      const periodLength = periodEnd.getTime() - periodStart.getTime();
      const comparisonStart = new Date(periodStart.getTime() - periodLength);
      const comparisonEnd = new Date(periodStart.getTime() - 1);
      
      const yearStart = startOfYear(now);
      
      let itemsWithoutPaymentDate = 0;

      // Build base filters for client selection
      const clientFilter = clientIds.length > 0 ? clientIds : null;

      // ===== FETCH TRANSACTIONS =====
      // For CASH mode: only include transactions that represent actual payments
      // For ACCRUAL mode: include all transactions when service was delivered
      
      let currentTransactionsQuery = supabase
        .from('credit_transactions')
        .select('amount, type, product_id, client_id, training_session_id, payment_method, created_at, products(purchase_price)')
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString());

      let comparisonTransactionsQuery = supabase
        .from('credit_transactions')
        .select('amount, type, product_id, client_id, training_session_id, payment_method, created_at, products(purchase_price)')
        .gte('created_at', comparisonStart.toISOString())
        .lte('created_at', comparisonEnd.toISOString());

      if (clientFilter) {
        currentTransactionsQuery = currentTransactionsQuery.in('client_id', clientFilter);
        comparisonTransactionsQuery = comparisonTransactionsQuery.in('client_id', clientFilter);
      }

      const [{ data: currentTransactions }, { data: comparisonTransactions }] = await Promise.all([
        currentTransactionsQuery,
        comparisonTransactionsQuery,
      ]);

      // ===== FETCH TRAININGS =====
      // For ACCRUAL: use training date (when service delivered)
      // For CASH: we need to cross-reference with transactions
      
      const trainingDateField = accountingMode === 'accrual' ? 'date' : 'date';
      
      let currentTrainingsQuery = supabase
        .from('training_sessions')
        .select('id, participant_count, final_price, client_id, date, payment_status, payment_method')
        .eq('status', 'completed')
        .gte('date', periodStart.toISOString())
        .lte('date', periodEnd.toISOString());

      let comparisonTrainingsQuery = supabase
        .from('training_sessions')
        .select('id, participant_count, final_price, client_id, date, payment_status')
        .eq('status', 'completed')
        .gte('date', comparisonStart.toISOString())
        .lte('date', comparisonEnd.toISOString());

      if (clientFilter) {
        currentTrainingsQuery = currentTrainingsQuery.in('client_id', clientFilter);
        comparisonTrainingsQuery = comparisonTrainingsQuery.in('client_id', clientFilter);
      }

      // Apply payment status filter
      if (paymentStatus === 'paid') {
        currentTrainingsQuery = currentTrainingsQuery.in('payment_status', ['paid_credit', 'paid_cash', 'paid_card', 'paid_bank']);
        comparisonTrainingsQuery = comparisonTrainingsQuery.in('payment_status', ['paid_credit', 'paid_cash', 'paid_card', 'paid_bank']);
      } else if (paymentStatus === 'unpaid') {
        currentTrainingsQuery = currentTrainingsQuery.eq('payment_status', 'pending');
        comparisonTrainingsQuery = comparisonTrainingsQuery.eq('payment_status', 'pending');
      }

      const [{ data: currentTrainingData }, { data: comparisonTrainingData }] = await Promise.all([
        currentTrainingsQuery,
        comparisonTrainingsQuery,
      ]);

      // ===== CALCULATE INCOME AND PROFIT =====
      let currentIncome = 0;
      let currentCosts = 0;
      let currentProductIncome = 0;
      let currentProductCost = 0;
      let currentProductSalesCount = 0;
      let comparisonIncome = 0;
      let comparisonCosts = 0;

      // Calculate credit received (dobití kreditu) - positive payment transactions without product
      let currentCreditReceived = 0;
      let comparisonCreditReceived = 0;

      currentTransactions?.forEach((t: any) => {
        // Handle credit top-ups (payment without product)
        if (t.type === 'payment' && t.amount > 0) {
          if (!t.product_id) {
            // Credit top-up only
            currentCreditReceived += t.amount;
            currentIncome += t.amount;
          }
        }
        // Handle product sales (type = 'product', amount is negative)
        if (t.type === 'product' && t.product_id) {
          const saleAmount = Math.abs(t.amount);
          currentProductIncome += saleAmount;
          currentProductSalesCount++;
          const purchasePrice = t.products?.purchase_price || 0;
          currentProductCost += purchasePrice;
          currentCosts += purchasePrice;
          currentIncome += saleAmount;
        }
      });

      comparisonTransactions?.forEach((t: any) => {
        if (t.type === 'payment' && t.amount > 0 && !t.product_id) {
          comparisonCreditReceived += t.amount;
          comparisonIncome += t.amount;
        }
        if (t.type === 'product' && t.product_id) {
          const saleAmount = Math.abs(t.amount);
          comparisonIncome += saleAmount;
          if (t.products?.purchase_price) {
            comparisonCosts += t.products.purchase_price;
          }
        }
      });

      // Calculate training income from completed trainings (value of delivered services)
      const currentTrainingIncome = currentTrainingData?.reduce((sum, t) => sum + (t.final_price || 0), 0) || 0;
      const comparisonTrainingIncome = comparisonTrainingData?.reduce((sum, t) => sum + (t.final_price || 0), 0) || 0;

      // Calculate average monthly income from credit top-ups
      const { data: allTransactions } = await supabase
        .from('credit_transactions')
        .select('amount, type, created_at, product_id')
        .eq('type', 'payment')
        .gt('amount', 0)
        .is('product_id', null);

      const monthlyIncomes: Record<string, number> = {};
      allTransactions?.forEach((t: any) => {
        const month = t.created_at.substring(0, 7);
        monthlyIncomes[month] = (monthlyIncomes[month] || 0) + t.amount;
      });
      const monthCount = Object.keys(monthlyIncomes).length || 1;
      const avgMonthlyIncome = Object.values(monthlyIncomes).reduce((a, b) => a + b, 0) / monthCount;

      // Calculate trends
      const trainingIncomeTrend = comparisonTrainingIncome > 0 
        ? ((currentTrainingIncome - comparisonTrainingIncome) / comparisonTrainingIncome) * 100 
        : 0;
      const creditReceivedTrend = comparisonCreditReceived > 0 
        ? ((currentCreditReceived - comparisonCreditReceived) / comparisonCreditReceived) * 100 
        : 0;
      const incomeTrend = comparisonIncome > 0 ? ((currentIncome - comparisonIncome) / comparisonIncome) * 100 : 0;
      const currentProfit = currentIncome - currentCosts;
      const comparisonProfit = comparisonIncome - comparisonCosts;
      const profitTrend = comparisonProfit > 0 ? ((currentProfit - comparisonProfit) / comparisonProfit) * 100 : 0;
      const profitMargin = currentIncome > 0 ? (currentProfit / currentIncome) * 100 : 0;
      
      // Product-specific profit and margin
      const productProfit = currentProductIncome - currentProductCost;
      const productMarginCalc = currentProductIncome > 0 ? (productProfit / currentProductIncome) * 100 : 0;

      // Training stats
      const currentTrainings = currentTrainingData?.length || 0;
      const comparisonTrainings = comparisonTrainingData?.length || 0;
      const avgParticipants = currentTrainings > 0
        ? (currentTrainingData?.reduce((sum, t) => sum + (t.participant_count || 1), 0) || 0) / currentTrainings
        : 1;
      const trainingsTrend = comparisonTrainings > 0 
        ? ((currentTrainings - comparisonTrainings) / comparisonTrainings) * 100 
        : 0;

      // Year trainings
      let yearTrainingsQuery = supabase
        .from('training_sessions')
        .select('id', { count: 'exact' })
        .eq('status', 'completed')
        .gte('date', yearStart.toISOString());
      
      if (clientFilter) {
        yearTrainingsQuery = yearTrainingsQuery.in('client_id', clientFilter);
      }
      
      const { count: yearTrainings } = await yearTrainingsQuery;

      // ===== CLIENTS =====
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const { data: recentSessions } = await supabase
        .from('training_sessions')
        .select('client_id')
        .gte('date', thirtyDaysAgo.toISOString());

      const activeClientIds = new Set(recentSessions?.map((s) => s.client_id) || []);

      const { data: allClients } = await supabase
        .from('clients')
        .select('id, is_archived, credit_balance, created_at');

      const totalClients = allClients?.filter(c => !c.is_archived).length || 0;
      const archivedClients = allClients?.filter(c => c.is_archived).length || 0;
      const newClientsThisMonth = allClients?.filter(c => {
        const createdAt = new Date(c.created_at);
        return createdAt >= periodStart && createdAt <= periodEnd;
      }).length || 0;
      const lowCreditClients = allClients?.filter(c => 
        !c.is_archived && (c.credit_balance || 0) < 800 && (c.credit_balance || 0) > 0
      ).length || 0;

      // ===== CANCELLATIONS =====
      let lateCancellationsQuery = supabase
        .from('training_sessions')
        .select('id', { count: 'exact' })
        .eq('status', 'canceled')
        .eq('is_late_cancellation', true)
        .gte('canceled_at', periodStart.toISOString())
        .lte('canceled_at', periodEnd.toISOString());

      let lateCancellationsComparisonQuery = supabase
        .from('training_sessions')
        .select('id', { count: 'exact' })
        .eq('status', 'canceled')
        .eq('is_late_cancellation', true)
        .gte('canceled_at', comparisonStart.toISOString())
        .lte('canceled_at', comparisonEnd.toISOString());

      let cancelledTrainingsQuery = supabase
        .from('training_sessions')
        .select('id, final_price')
        .eq('status', 'canceled')
        .gte('canceled_at', periodStart.toISOString())
        .lte('canceled_at', periodEnd.toISOString());

      let allScheduledQuery = supabase
        .from('training_sessions')
        .select('id', { count: 'exact' })
        .gte('date', periodStart.toISOString())
        .lte('date', periodEnd.toISOString());

      if (clientFilter) {
        lateCancellationsQuery = lateCancellationsQuery.in('client_id', clientFilter);
        lateCancellationsComparisonQuery = lateCancellationsComparisonQuery.in('client_id', clientFilter);
        cancelledTrainingsQuery = cancelledTrainingsQuery.in('client_id', clientFilter);
        allScheduledQuery = allScheduledQuery.in('client_id', clientFilter);
      }

      const [
        { count: lateCancellations },
        { count: lateCancellationsLastMonth },
        { data: cancelledTrainings },
        { count: allScheduledThisMonth }
      ] = await Promise.all([
        lateCancellationsQuery,
        lateCancellationsComparisonQuery,
        cancelledTrainingsQuery,
        allScheduledQuery,
      ]);

      const totalCancellations = cancelledTrainings?.length || 0;
      const cancellationLoss = cancelledTrainings?.reduce((sum, t) => sum + (t.final_price || 0), 0) || 0;
      const cancellationRate = (allScheduledThisMonth || 0) > 0 
        ? (totalCancellations / (allScheduledThisMonth || 1)) * 100 
        : 0;

      // ===== UNPAID =====
      let unpaidQuery = supabase
        .from('training_sessions')
        .select('final_price, client_id, date')
        .eq('payment_status', 'pending')
        .eq('status', 'completed')
        .order('date', { ascending: true });

      if (clientFilter) {
        unpaidQuery = unpaidQuery.in('client_id', clientFilter);
      }

      const { data: unpaidTrainings } = await unpaidQuery;

      const unpaidCount = unpaidTrainings?.length || 0;
      const unpaidAmount = unpaidTrainings?.reduce((sum, t) => sum + (t.final_price || 0), 0) || 0;
      const unpaidClientIds = new Set(unpaidTrainings?.map(t => t.client_id) || []);
      const unpaidClientsCount = unpaidClientIds.size;
      const avgUnpaidPerClient = unpaidClientsCount > 0 ? unpaidAmount / unpaidClientsCount : 0;
      const oldestUnpaidDays = unpaidTrainings?.length 
        ? differenceInDays(now, new Date(unpaidTrainings[0].date))
        : null;

      // ===== NEW KPIs =====
      // Income per training
      const incomePerTraining = currentTrainings > 0 ? currentTrainingIncome / currentTrainings : 0;
      
      // Product income share (percentage)
      const productIncomeShare = currentIncome > 0 ? (currentProductIncome / currentIncome) * 100 : 0;
      
      // Unpaid by age
      const unpaidByAge: UnpaidByAge = {
        days0to7: { count: 0, amount: 0 },
        days8to30: { count: 0, amount: 0 },
        days31plus: { count: 0, amount: 0 },
      };
      
      unpaidTrainings?.forEach(t => {
        const daysOld = differenceInDays(now, new Date(t.date));
        const price = t.final_price || 0;
        
        if (daysOld <= 7) {
          unpaidByAge.days0to7.count++;
          unpaidByAge.days0to7.amount += price;
        } else if (daysOld <= 30) {
          unpaidByAge.days8to30.count++;
          unpaidByAge.days8to30.amount += price;
        } else {
          unpaidByAge.days31plus.count++;
          unpaidByAge.days31plus.amount += price;
        }
      });

      return {
        // Income (from trainings)
        incomeThisMonth: currentIncome,
        incomeLastMonth: comparisonIncome,
        avgMonthlyIncome,
        trainingIncome: currentTrainingIncome,
        trainingIncomeLastMonth: comparisonTrainingIncome,
        trainingIncomeTrend,
        productIncome: currentProductIncome,
        incomeTrend,
        
        // Credit received (dobití kreditu)
        creditReceived: currentCreditReceived,
        creditReceivedLastMonth: comparisonCreditReceived,
        creditReceivedTrend,
        
        // New KPIs
        incomePerTraining,
        productIncomeShare,
        unpaidByAge,
        
        // Product specific
        productCost: currentProductCost,
        productProfit,
        productMargin: productMarginCalc,
        productSalesCount: currentProductSalesCount,
        
        // Profit (total)
        netProfitThisMonth: currentProfit,
        expensesThisMonth: currentCosts,
        profitMargin,
        profitTrend,
        
        // Trainings
        trainingsThisMonth: currentTrainings,
        trainingsLastMonth: comparisonTrainings,
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
        
        // Metadata
        accountingMode,
        itemsWithoutPaymentDate,
      } as DashboardKPIs;
    },
  });
}