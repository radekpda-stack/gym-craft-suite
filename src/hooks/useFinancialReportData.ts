import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfYear, endOfYear, subYears, getISOWeek, eachMonthOfInterval } from "date-fns";
import { cs } from "date-fns/locale";
import type { FinancialReportSettings } from "./useFinancialReportSettings";

export interface ClientReportData {
  id: string;
  name: string;
  totalPaid: number;
  trainingCount: number;
  soloCount: number;
  duoCount: number;
  trioCount: number;
}

export interface MonthlyReportData {
  month: string;
  monthNum: number;
  income: number;
  trainingCount: number;
  soloCount: number;
  duoCount: number;
  trioCount: number;
  clientCount: number;
  changePercent: number | null;
}

export interface WeeklyReportData {
  week: number;
  weekLabel: string;
  trainingCount: number;
  soloCount: number;
  duoCount: number;
  trioCount: number;
  income: number;
}

export interface PaymentMethodBreakdown {
  cash: number;
  card: number;
  bank_transfer: number;
  credit: number;
}

export interface ProductSaleData {
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  totalRevenue: number;
  totalCost: number;
  margin: number;
  marginPercent: number;
  clientCount: number;
}

export interface ProductClientData {
  clientId: string;
  clientName: string;
  totalSpent: number;
  productCount: number;
  orderCount: number;
}

// NEW: Training summary with accurate calculations
export interface TrainingsSummary {
  totalTrainings: number;
  totalHours: number;
  totalTrainedValue: number;         // suma final_price všech tréninků
  paidTrainingsCount: number;        // tréninky s transakcí
  paidHours: number;                 // hodiny zaplacených tréninků
  paidValue: number;                 // skutečně uhrazeno za tréninky
  avgPricePerTraining: number;       // opravený výpočet (pouze zaplacené)
  avgHourlyRate: number;             // opravený výpočet (pouze zaplacené)
  unpaidTrainingsCount: number;
  unpaidValue: number;
}

// NEW: Payments summary
export interface PaymentsSummary {
  totalPayments: number;             // suma plateb (payment + manual)
  trainingPayments: number;          // úhrady za tréninky (credit_transactions type=training)
  directPayments: number;            // přímé platby (credit)
  productPayments: number;           // platby za produkty
  paymentTransactionCount: number;   // počet platebních transakcí
}

export interface FinancialReportData {
  period: {
    start: Date;
    end: Date;
    label: string;
  };
  
  // Year summary
  summary: {
    totalIncome: number;
    trainingIncome: number;
    productIncome: number;
    paymentIncome: number;
    totalTrainings: number;
    totalClients: number;
    soloTrainings: number;
    duoTrainings: number;
    trioTrainings: number;
    avgIncomePerTraining: number;
    avgIncomePerClient: number;
    // Product summary
    totalProductRevenue: number;
    totalProductCost: number;
    totalProductMargin: number;
    totalProductMarginPercent: number;
    // Expenses & net profit
    totalExpenses: number;
    netProfit: number;
    // Payment method breakdown
    paymentMethodBreakdown: PaymentMethodBreakdown;
  };
  
  // NEW: Trainings and payments summary
  trainingsSummary: TrainingsSummary;
  paymentsSummary: PaymentsSummary;
  
  // Monthly breakdown
  monthly: MonthlyReportData[];
  
  // Weekly breakdown
  weekly: WeeklyReportData[];
  
  // Clients
  clients: ClientReportData[];
  topClientsRevenuePercent: number;
  
  // Product sales
  products: ProductSaleData[];
  totalProductsSold: number;
  
  // Product clients breakdown (who buys the most)
  productClients: ProductClientData[];
  
  // Managerial metrics
  managerial: {
    incomePerHour: number | null;
    groupTrainingPercent: number;
    bestMonth: { name: string; income: number } | null;
    worstMonth: { name: string; income: number } | null;
    ytdIncome: number;
    lastYearIncome: number;
    yoyChangePercent: number | null;
  };
  
  // Data validation
  validation: {
    paymentsWithoutClient: number;
    trainingsWithoutClient: number;
    trainedNotPaidDiff: number;
  };
}

export type ReportPeriod = 'year' | '12months' | 'custom';

interface UseFinancialReportDataOptions {
  period: ReportPeriod;
  customStart?: Date;
  customEnd?: Date;
  settings: FinancialReportSettings;
}

export function useFinancialReportData(options: UseFinancialReportDataOptions) {
  const { period, customStart, customEnd, settings } = options;
  
  return useQuery({
    queryKey: ['financial-report-data', period, customStart?.toISOString(), customEnd?.toISOString(), settings.clientDefinition],
    queryFn: async (): Promise<FinancialReportData> => {
      const now = new Date();
      let startDate: Date;
      let endDate: Date;
      let periodLabel: string;
      
      switch (period) {
        case 'year':
          startDate = startOfYear(now);
          // Use current date if we're in the middle of the year
          endDate = now < endOfYear(now) ? now : endOfYear(now);
          periodLabel = `Rok ${now.getFullYear()} (do ${format(endDate, 'd.M.', { locale: cs })})`;
          break;
        case '12months':
          endDate = now;
          startDate = subYears(now, 1);
          periodLabel = `Posledních 12 měsíců`;
          break;
        case 'custom':
          startDate = customStart || startOfYear(now);
          endDate = customEnd || now;
          periodLabel = `${format(startDate, 'd.M.yyyy')} - ${format(endDate, 'd.M.yyyy')}`;
          break;
        default:
          startDate = startOfYear(now);
          endDate = now;
          periodLabel = `Rok ${now.getFullYear()}`;
      }

      const startStr = startDate.toISOString();
      const endStr = endDate.toISOString();

      // Fetch all data in parallel
      const [
        trainingsResult,
        transactionsResult,
        salesOrdersResult,
        salesOrderItemsResult,
        clientsResult,
        participantsResult,
        lastYearTransactionsResult,
        productsResult,
        trainingTransactionsResult,
        expensesResult,
        allTransactionsWithMethodResult,
      ] = await Promise.all([
        // Trainings
        supabase
          .from('training_sessions')
          .select('id, date, duration, status, final_price, client_id, participant_count')
          .eq('status', 'completed')
          .gte('date', startStr)
          .lte('date', endStr),
        
        // Transactions (payments + manual positive)
        supabase
          .from('credit_transactions')
          .select('id, amount, type, client_id, created_at')
          .in('type', ['payment', 'manual'])
          .gt('amount', 0)
          .gte('created_at', startStr)
          .lte('created_at', endStr),
        
        // Sales orders
        supabase
          .from('sales_orders')
          .select('id, client_id, total_amount, payment_method, payment_status, created_at')
          .eq('payment_status', 'completed')
          .gte('created_at', startStr)
          .lte('created_at', endStr),
        
        // Sales order items with product details
        supabase
          .from('sales_order_items')
          .select(`
            id, 
            order_id, 
            product_id, 
            name_snapshot, 
            unit_price, 
            quantity, 
            line_total,
            line_total_after_discount,
            product_kind,
            products(id, name, category, purchase_price)
          `),
        
        // Clients
        supabase
          .from('clients')
          .select('id, name, is_archived'),
        
        // Participants for multi-client trainings
        supabase
          .from('training_participants')
          .select('client_id, price_share, training_session_id, training_sessions!inner(status, date, duration, participant_count)')
          .eq('training_sessions.status', 'completed')
          .gte('training_sessions.date', startStr)
          .lte('training_sessions.date', endStr),
        
        // Last year transactions for YoY comparison
        supabase
          .from('credit_transactions')
          .select('amount, type')
          .in('type', ['payment', 'manual'])
          .gt('amount', 0)
          .gte('created_at', subYears(startDate, 1).toISOString())
          .lte('created_at', subYears(endDate, 1).toISOString()),
        
        // Products catalog
        supabase
          .from('products')
          .select('id, name, category, purchase_price'),
        
        // Training transactions - for accurate hourly rate and avg price calculation
        supabase
          .from('credit_transactions')
          .select('id, training_session_id, amount, training_sessions!inner(duration)')
          .eq('type', 'training')
          .not('training_session_id', 'is', null)
          .gte('created_at', startStr)
          .lte('created_at', endStr),
        
        // Business expenses
        supabase
          .from('business_expenses')
          .select('amount, category, date')
          .gte('date', format(startDate, 'yyyy-MM-dd'))
          .lte('date', format(endDate, 'yyyy-MM-dd')),
        
        // All transactions with payment_method for breakdown
        supabase
          .from('credit_transactions')
          .select('amount, type, payment_method, created_at')
          .in('type', ['payment', 'manual', 'training', 'product'])
          .gte('created_at', startStr)
          .lte('created_at', endStr),
      ]);

      const trainings = trainingsResult.data || [];
      const transactions = transactionsResult.data || [];
      const salesOrders = salesOrdersResult.data || [];
      const allOrderItems = salesOrderItemsResult.data || [];
      const clients = clientsResult.data || [];
      const participants = participantsResult.data || [];
      const lastYearTransactions = lastYearTransactionsResult.data || [];
      const products = productsResult.data || [];
      const trainingTransactions = trainingTransactionsResult.data || [];
      const expenses = expensesResult.data || [];
      const allTransactionsWithMethod = allTransactionsWithMethodResult.data || [];

      // Build maps
      const clientMap = new Map(clients.map(c => [c.id, c.name]));
      const productMap = new Map(products.map(p => [p.id, { name: p.name, category: p.category, purchasePrice: p.purchase_price || 0 }]));

      // Filter order items to only include those from orders in our period
      const orderIds = new Set(salesOrders.map(o => o.id));
      const orderClientMap = new Map(salesOrders.map(o => [o.id, o.client_id]));
      const orderItems = allOrderItems.filter(item => orderIds.has(item.order_id));

      // Calculate income from different sources based on settings
      const paymentIncome = settings.dataSources.clientPayments 
        ? transactions.reduce((sum, t) => sum + (t.amount || 0), 0) 
        : 0;
      
      // Product income from sales_orders
      const productIncome = settings.dataSources.productSales 
        ? salesOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
        : 0;
      
      const trainingIncome = settings.dataSources.trainings 
        ? trainings.reduce((sum, t) => sum + (t.final_price || 0), 0) 
        : 0;
      
      const totalIncome = paymentIncome + productIncome;
      const lastYearIncome = lastYearTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

      // Count trainings by participant count
      const soloTrainings = trainings.filter(t => (t.participant_count || 1) === 1).length;
      const duoTrainings = trainings.filter(t => t.participant_count === 2).length;
      const trioTrainings = trainings.filter(t => (t.participant_count || 0) >= 3).length;

      // Calculate total training hours
      const totalMinutes = trainings.reduce((sum, t) => sum + (t.duration || 60), 0);
      const totalHours = totalMinutes / 60;

      // Active clients based on definition
      const clientsWithTraining = new Set<string>();
      const clientsWithPayment = new Set<string>();
      const clientStats = new Map<string, { paid: number; trainings: number; solo: number; duo: number; trio: number }>();

      // Process trainings for client stats
      trainings.forEach(t => {
        if (t.client_id) {
          clientsWithTraining.add(t.client_id);
          const stats = clientStats.get(t.client_id) || { paid: 0, trainings: 0, solo: 0, duo: 0, trio: 0 };
          stats.trainings += 1;
          const pc = t.participant_count || 1;
          if (pc === 1) stats.solo += 1;
          else if (pc === 2) stats.duo += 1;
          else stats.trio += 1;
          clientStats.set(t.client_id, stats);
        }
      });

      // Process participants for multi-client trainings
      participants.forEach((p: any) => {
        if (p.client_id) {
          clientsWithTraining.add(p.client_id);
          const stats = clientStats.get(p.client_id) || { paid: 0, trainings: 0, solo: 0, duo: 0, trio: 0 };
          stats.trainings += 1;
          const pc = p.training_sessions?.participant_count || 1;
          if (pc === 1) stats.solo += 1;
          else if (pc === 2) stats.duo += 1;
          else stats.trio += 1;
          clientStats.set(p.client_id, stats);
        }
      });

      // Process transactions for client payments
      transactions.forEach(t => {
        if (t.client_id) {
          clientsWithPayment.add(t.client_id);
          const stats = clientStats.get(t.client_id) || { paid: 0, trainings: 0, solo: 0, duo: 0, trio: 0 };
          stats.paid += t.amount || 0;
          clientStats.set(t.client_id, stats);
        }
      });

      // Determine active clients based on setting
      let activeClientIds: Set<string>;
      if (settings.clientDefinition === 'trainings') {
        activeClientIds = clientsWithTraining;
      } else if (settings.clientDefinition === 'payments') {
        activeClientIds = clientsWithPayment;
      } else {
        activeClientIds = new Set([...clientsWithTraining, ...clientsWithPayment]);
      }

      const totalClients = activeClientIds.size;

      // Build client breakdown
      const clientsData: ClientReportData[] = Array.from(clientStats.entries())
        .filter(([id]) => activeClientIds.has(id))
        .map(([id, stats]) => ({
          id,
          name: clientMap.get(id) || 'Neznámý',
          totalPaid: stats.paid,
          trainingCount: stats.trainings,
          soloCount: stats.solo,
          duoCount: stats.duo,
          trioCount: stats.trio,
        }))
        .sort((a, b) => b.totalPaid - a.totalPaid);

      // Top 20% clients revenue percentage
      const top20Count = Math.max(1, Math.ceil(clientsData.length * 0.2));
      const top20Revenue = clientsData.slice(0, top20Count).reduce((sum, c) => sum + c.totalPaid, 0);
      const topClientsRevenuePercent = totalIncome > 0 ? (top20Revenue / totalIncome) * 100 : 0;

      // Monthly breakdown
      const monthlyMap = new Map<string, { income: number; trainings: number; solo: number; duo: number; trio: number; clients: Set<string> }>();
      const months = eachMonthOfInterval({ start: startDate, end: endDate });
      
      months.forEach(month => {
        const key = format(month, 'yyyy-MM');
        monthlyMap.set(key, { income: 0, trainings: 0, solo: 0, duo: 0, trio: 0, clients: new Set() });
      });

      trainings.forEach(t => {
        const key = format(new Date(t.date), 'yyyy-MM');
        const data = monthlyMap.get(key);
        if (data) {
          data.trainings += 1;
          const pc = t.participant_count || 1;
          if (pc === 1) data.solo += 1;
          else if (pc === 2) data.duo += 1;
          else data.trio += 1;
          if (t.client_id) data.clients.add(t.client_id);
        }
      });

      transactions.forEach(t => {
        const key = format(new Date(t.created_at), 'yyyy-MM');
        const data = monthlyMap.get(key);
        if (data) {
          data.income += t.amount || 0;
          if (t.client_id) data.clients.add(t.client_id);
        }
      });

      // Add product income from sales orders to monthly
      salesOrders.forEach(o => {
        const key = format(new Date(o.created_at), 'yyyy-MM');
        const data = monthlyMap.get(key);
        if (data) {
          data.income += o.total_amount || 0;
        }
      });

      const monthlyData: MonthlyReportData[] = [];
      let prevIncome: number | null = null;
      
      Array.from(monthlyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([key, data]) => {
          const date = new Date(key + '-01');
          const changePercent = prevIncome !== null && prevIncome > 0 
            ? ((data.income - prevIncome) / prevIncome) * 100 
            : null;
          
          monthlyData.push({
            month: format(date, 'LLLL', { locale: cs }),
            monthNum: date.getMonth() + 1,
            income: data.income,
            trainingCount: data.trainings,
            soloCount: data.solo,
            duoCount: data.duo,
            trioCount: data.trio,
            clientCount: data.clients.size,
            changePercent,
          });
          
          prevIncome = data.income;
        });

      // Weekly breakdown - use composite key for proper sorting across years
      const weeklyMap = new Map<string, { week: number; year: number; trainings: number; solo: number; duo: number; trio: number; income: number }>();
      
      trainings.forEach(t => {
        const date = new Date(t.date);
        const week = getISOWeek(date);
        const year = date.getFullYear();
        const key = `${year}-W${week.toString().padStart(2, '0')}`;
        const data = weeklyMap.get(key) || { week, year, trainings: 0, solo: 0, duo: 0, trio: 0, income: 0 };
        data.trainings += 1;
        data.income += t.final_price || 0;
        const pc = t.participant_count || 1;
        if (pc === 1) data.solo += 1;
        else if (pc === 2) data.duo += 1;
        else data.trio += 1;
        weeklyMap.set(key, data);
      });

      const weeklyData: WeeklyReportData[] = Array.from(weeklyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, data]) => ({
          week: data.week,
          weekLabel: `${data.week}. týden ${data.year}`,
          trainingCount: data.trainings,
          soloCount: data.solo,
          duoCount: data.duo,
          trioCount: data.trio,
          income: data.income,
        }));

      // Managerial metrics
      const bestMonth = monthlyData.length > 0 
        ? monthlyData.reduce((best, m) => m.income > best.income ? m : best)
        : null;
      const worstMonth = monthlyData.filter(m => m.income > 0).length > 0
        ? monthlyData.filter(m => m.income > 0).reduce((worst, m) => m.income < worst.income ? m : worst)
        : null;

      const groupTrainings = duoTrainings + trioTrainings;
      const groupTrainingPercent = trainings.length > 0 ? (groupTrainings / trainings.length) * 100 : 0;
      
      const yoyChangePercent = lastYearIncome > 0 
        ? ((totalIncome - lastYearIncome) / lastYearIncome) * 100 
        : null;

      // Data validation
      const paymentsWithoutClient = transactions.filter(t => !t.client_id).length;
      const trainingsWithoutClient = trainings.filter(t => !t.client_id && (t.participant_count || 1) === 1).length;
      const trainedTotal = trainings.reduce((sum, t) => sum + (t.final_price || 0), 0);
      // FIXED: compare with paidTrainingValue, not paymentIncome
      // paidTrainingValue is calculated later, so we use a forward reference pattern
      // We'll compute it here too for validation
      const trainedNotPaidDiffFn = (ptv: number) => trainedTotal - ptv;

      // ========== PRODUCT SALES BREAKDOWN (from sales_order_items) ==========
      const productSalesMap = new Map<string, { 
        quantity: number; 
        revenue: number; 
        cost: number;
        category: string;
        clients: Set<string>;
      }>();
      
      let totalProductRevenue = 0;
      let totalProductCost = 0;
      let totalProductsSold = 0;
      
      orderItems.forEach(item => {
        const productId = item.product_id || 'unknown';
        const productInfo = productMap.get(productId);
        const purchasePrice = (item.products as any)?.purchase_price || productInfo?.purchasePrice || 0;
        const category = (item.products as any)?.category || productInfo?.category || 'Ostatní';
        const revenue = item.line_total_after_discount || item.line_total || 0;
        const quantity = item.quantity || 1;
        const cost = purchasePrice * quantity;
        
        totalProductRevenue += revenue;
        totalProductCost += cost;
        totalProductsSold += quantity;
        
        const data = productSalesMap.get(productId) || { 
          quantity: 0, 
          revenue: 0, 
          cost: 0,
          category,
          clients: new Set() 
        };
        data.quantity += quantity;
        data.revenue += revenue;
        data.cost += cost;
        
        const clientId = orderClientMap.get(item.order_id);
        if (clientId) data.clients.add(clientId);
        
        productSalesMap.set(productId, data);
      });

      const productsData: ProductSaleData[] = Array.from(productSalesMap.entries())
        .map(([productId, data]) => {
          const productInfo = productMap.get(productId);
          const margin = data.revenue - data.cost;
          const marginPercent = data.revenue > 0 ? (margin / data.revenue) * 100 : 0;
          
          return {
            productId,
            productName: productInfo?.name || 'Neznámý produkt',
            category: data.category,
            quantity: data.quantity,
            totalRevenue: data.revenue,
            totalCost: data.cost,
            margin,
            marginPercent,
            clientCount: data.clients.size,
          };
        })
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      const totalProductMargin = totalProductRevenue - totalProductCost;
      const totalProductMarginPercent = totalProductRevenue > 0 ? (totalProductMargin / totalProductRevenue) * 100 : 0;

      // ========== PRODUCT CLIENTS BREAKDOWN (who buys the most) ==========
      const productClientMap = new Map<string, { 
        spent: number; 
        productCount: number;
        orders: Set<string>;
      }>();
      
      orderItems.forEach(item => {
        const clientId = orderClientMap.get(item.order_id);
        if (!clientId) return;
        
        const revenue = item.line_total_after_discount || item.line_total || 0;
        const quantity = item.quantity || 1;
        
        const data = productClientMap.get(clientId) || { spent: 0, productCount: 0, orders: new Set() };
        data.spent += revenue;
        data.productCount += quantity;
        data.orders.add(item.order_id);
        productClientMap.set(clientId, data);
      });

      const productClientsData: ProductClientData[] = Array.from(productClientMap.entries())
        .map(([clientId, data]) => ({
          clientId,
          clientName: clientMap.get(clientId) || 'Neznámý',
          totalSpent: data.spent,
          productCount: data.productCount,
          orderCount: data.orders.size,
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent);

      // ========== CALCULATE ACCURATE TRAINING METRICS ==========
      // Group training transactions by session to avoid counting same session multiple times (group trainings)
      const paidSessionMap = new Map<string, { amount: number; duration: number }>();
      trainingTransactions.forEach((t: any) => {
        if (t.training_session_id && t.training_sessions?.duration) {
          const existing = paidSessionMap.get(t.training_session_id);
          if (existing) {
            // For group trainings, sum up the amounts but keep the same duration
            existing.amount += Math.abs(t.amount || 0);
          } else {
            paidSessionMap.set(t.training_session_id, {
              amount: Math.abs(t.amount || 0),
              duration: t.training_sessions.duration
            });
          }
        }
      });
      
      const paidTrainingsCount = paidSessionMap.size;
      const paidTrainingValue = Array.from(paidSessionMap.values()).reduce((sum, t) => sum + t.amount, 0);
      const paidTrainingMinutes = Array.from(paidSessionMap.values()).reduce((sum, t) => sum + t.duration, 0);
      const paidTrainingHours = paidTrainingMinutes / 60;
      
      // Calculate accurate metrics (only from paid trainings)
      const accurateAvgPricePerTraining = paidTrainingsCount > 0 
        ? Math.round(paidTrainingValue / paidTrainingsCount) 
        : 0;
      const accurateHourlyRate = paidTrainingHours > 0 
        ? Math.round(paidTrainingValue / paidTrainingHours) 
        : null;
      
      // Unpaid trainings
      const paidSessionIds = new Set(paidSessionMap.keys());
      const unpaidTrainings = trainings.filter(t => !paidSessionIds.has(t.id));
      const unpaidTrainingsCount = unpaidTrainings.length;
      const unpaidValue = unpaidTrainings.reduce((sum, t) => sum + (t.final_price || 0), 0);
      
      // Build trainings summary
      const trainingsSummary: import('./useFinancialReportData').TrainingsSummary = {
        totalTrainings: trainings.length,
        totalHours: totalHours,
        totalTrainedValue: trainingIncome,
        paidTrainingsCount,
        paidHours: paidTrainingHours,
        paidValue: paidTrainingValue,
        avgPricePerTraining: accurateAvgPricePerTraining,
        avgHourlyRate: accurateHourlyRate || 0,
        unpaidTrainingsCount,
        unpaidValue,
      };
      
      // Build payments summary
      const paymentsSummary: import('./useFinancialReportData').PaymentsSummary = {
        totalPayments: paymentIncome + productIncome,
        trainingPayments: paidTrainingValue,
        directPayments: paymentIncome - paidTrainingValue, // FIXED: only direct credit top-ups
        productPayments: productIncome,
        paymentTransactionCount: transactions.length,
      };

      // Calculate expenses
      const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const netProfit = totalIncome - totalExpenses - totalProductCost;

      // Payment method breakdown
      const paymentMethodBreakdown: PaymentMethodBreakdown = { cash: 0, card: 0, bank_transfer: 0, credit: 0 };
      allTransactionsWithMethod.forEach((t: any) => {
        const amount = Math.abs(t.amount || 0);
        const method = t.payment_method || '';
        if (method === 'cash' || method === 'paid_cash') paymentMethodBreakdown.cash += amount;
        else if (method === 'card' || method === 'paid_card') paymentMethodBreakdown.card += amount;
        else if (method === 'bank_transfer' || method === 'bank' || method === 'paid_bank') paymentMethodBreakdown.bank_transfer += amount;
        else if (method === 'credit' || method === 'paid_credit') paymentMethodBreakdown.credit += amount;
      });

      // Also add sales order payment methods
      salesOrders.forEach(o => {
        const amount = o.total_amount || 0;
        const method = (o.payment_method || '') as string;
        if (method === 'cash') paymentMethodBreakdown.cash += amount;
        else if (method === 'card') paymentMethodBreakdown.card += amount;
        else if (method === 'bank_transfer' || method === 'bank') paymentMethodBreakdown.bank_transfer += amount;
        else if (method === 'credit') paymentMethodBreakdown.credit += amount;
      });

      return {
        period: {
          start: startDate,
          end: endDate,
          label: periodLabel,
        },
        summary: {
          totalIncome,
          trainingIncome,
          productIncome,
          paymentIncome,
          totalTrainings: settings.dataSources.trainings ? trainings.length : 0,
          totalClients,
          soloTrainings,
          duoTrainings,
          trioTrainings,
          avgIncomePerTraining: accurateAvgPricePerTraining, // FIXED: use accurate calculation
          avgIncomePerClient: totalClients > 0 ? totalIncome / totalClients : 0,
          // Product summary
          totalProductRevenue,
          totalProductCost,
           totalProductMargin,
           totalProductMarginPercent,
           totalExpenses,
           netProfit,
           paymentMethodBreakdown,
        },
        trainingsSummary,
        paymentsSummary,
        monthly: monthlyData,
        weekly: weeklyData,
        clients: clientsData,
        topClientsRevenuePercent,
        products: productsData,
        totalProductsSold,
        productClients: productClientsData,
        managerial: {
          incomePerHour: accurateHourlyRate, // FIXED: use accurate calculation
          groupTrainingPercent,
          bestMonth: bestMonth ? { name: bestMonth.month, income: bestMonth.income } : null,
          worstMonth: worstMonth ? { name: worstMonth.month, income: worstMonth.income } : null,
          ytdIncome: totalIncome,
          lastYearIncome,
          yoyChangePercent,
        },
        validation: {
          paymentsWithoutClient,
          trainingsWithoutClient,
          trainedNotPaidDiff: trainedNotPaidDiffFn(paidTrainingValue),
        },
      };
    },
    enabled: settings.isEnabled,
  });
}
