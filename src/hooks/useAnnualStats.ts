import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfYear, endOfYear, subMonths, format, differenceInDays } from 'date-fns';

export type StatsPeriod = 'all' | 'year' | 'custom';

export interface MonthlyTrendPoint {
  month: string;
  label: string;
  trainings: number;
  income: number;
}

export interface AnnualStatsData {
  // Period info
  periodStart: Date;
  periodEnd: Date;
  totalDays: number;
  activeDays: number;
  
  // Trainings
  totalTrainings: number;
  completedTrainings: number;
  canceledTrainings: number;
  lateCancellations: number;
  avgTrainingsPerWeek: number;
  avgTrainingPrice: number;
  avgTrainingPriceActual: number; // Actual price from credit_transactions
  avgTrainingPriceTrend: number; // % change vs last month
  mostActiveMonth: string;
  mostActiveDay: string;
  
  // Monthly trend for chart
  monthlyTrend: MonthlyTrendPoint[];
  
  // Clients
  totalClients: number;
  activeClients: number;
  archivedClients: number;
  avgTrainingsPerClient: number;
  topClientsByTrainings: Array<{ name: string; count: number }>;
  topClientsBySpent: Array<{ name: string; amount: number }>;
  topClientByProducts: { name: string; count: number; spent: number } | null;
  
  // Exercises & PRs
  totalExerciseEntries: number;
  uniqueExercises: number;
  totalPRs: number;
  maxWeightLifted: { weight: number; exercise: string; client: string } | null;
  topExercises: Array<{ name: string; count: number }>;
  leastUsedExercises: Array<{ name: string; count: number }>;
  
  // Finance - KEY METRICS
  receivedCredit: number; // Total credit received from clients (payments)
  receivedCreditThisMonth: number; // Credit received this month
  receivedCreditLastMonth: number; // Credit received last month
  totalIncome: number; // Total earned (trainings + products)
  trainingIncome: number;
  productIncome: number;
  avgMonthlyIncome: number;
  avgMonthlyIncomeCompleted: number; // Only completed months
  pendingPayments: { count: number; amount: number; clients: Array<{ id: string; name: string; balance: number }> };
  topProducts: Array<{ name: string; count: number; revenue: number }>;
  
  // Measurements & Diagnostics
  totalMeasurements: number;
  totalDiagnostics: number;
  totalPhotos: number;
  totalVoiceNotes: number;
  
  // Feedback
  totalFeedback: number;
  avgBodyFeel: number;
  avgSessionFit: number;
  
  // Feature usage
  totalFeatureUsage: number;
  topFeatures: Array<{ name: string; count: number }>;
  leastUsedFeatures: Array<{ name: string; count: number }>;
}

export function useAnnualStats(
  period: StatsPeriod = 'all',
  customStart?: Date,
  customEnd?: Date
) {
  return useQuery({
    queryKey: ['annual-stats', period, customStart?.toISOString(), customEnd?.toISOString()],
    queryFn: async (): Promise<AnnualStatsData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Determine date range
      let startDate: Date;
      let endDate = new Date();
      
      if (period === 'year') {
        startDate = startOfYear(new Date());
        endDate = endOfYear(new Date());
      } else if (period === 'custom' && customStart && customEnd) {
        startDate = customStart;
        endDate = customEnd;
      } else {
        // All time - get first record date
        const { data: firstTraining } = await supabase
          .from('training_sessions')
          .select('date')
          .eq('user_id', user.id)
          .order('date', { ascending: true })
          .limit(1)
          .single();
        
        startDate = firstTraining ? new Date(firstTraining.date) : subMonths(new Date(), 12);
      }

      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      // Fetch all data in parallel
      const [
        trainingsResult,
        clientsResult,
        exerciseEntriesResult,
        creditTransactionsResult,
        measurementsResult,
        diagnosticsResult,
        mediaResult,
        feedbackResult,
        featureUsageResult,
        productsResult,
        budgetMembersResult,
      ] = await Promise.all([
        // Trainings
        supabase
          .from('training_sessions')
          .select('id, date, status, payment_status, final_price, canceled_at, client_id')
          .eq('user_id', user.id)
          .gte('date', startStr)
          .lte('date', endStr),
        
        // Clients
        supabase
          .from('clients')
          .select('id, name, is_archived, created_at, credit_balance')
          .eq('user_id', user.id),
        
        // Exercise entries
        supabase
          .from('exercise_entries')
          .select('id, exercise_name, weight_kg, is_pr, client_id, date')
          .eq('user_id', user.id)
          .gte('date', startStr)
          .lte('date', endStr),
        
        // Credit transactions (for income)
        supabase
          .from('credit_transactions')
          .select('id, amount, type, client_id, product_id, created_at, training_session_id, description')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        
        // Measurements
        supabase
          .from('measurements')
          .select('id')
          .eq('user_id', user.id)
          .gte('date', startStr)
          .lte('date', endStr),
        
        // Diagnostics
        supabase
          .from('diagnostics')
          .select('id')
          .eq('user_id', user.id)
          .gte('date', startStr)
          .lte('date', endStr),
        
        // Media (photos & voice notes)
        supabase
          .from('client_media')
          .select('id, type')
          .eq('user_id', user.id)
          .gte('date', startStr)
          .lte('date', endStr),
        
        // Feedback
        supabase
          .from('training_feedback')
          .select('id, body_feel, session_fit')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        
        // Feature usage
        supabase
          .from('feature_usage')
          .select('id, feature_name')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        
        // Products
        supabase
          .from('products')
          .select('id, name')
          .eq('user_id', user.id),
        
        // Budget members (clients in shared budget groups)
        supabase
          .from('client_budget_members')
          .select('client_id')
          .eq('user_id', user.id),
      ]);

      const trainings = trainingsResult.data || [];
      const clients = clientsResult.data || [];
      const exerciseEntries = exerciseEntriesResult.data || [];
      const creditTransactions = creditTransactionsResult.data || [];
      const measurements = measurementsResult.data || [];
      const diagnostics = diagnosticsResult.data || [];
      const media = mediaResult.data || [];
      const feedback = feedbackResult.data || [];
      const featureUsage = featureUsageResult.data || [];
      const products = productsResult.data || [];
      const budgetMembers = budgetMembersResult.data || [];
      
      // Set of client IDs that are in budget groups (they don't have individual debt)
      const clientsInBudgetGroups = new Set(budgetMembers.map(bm => bm.client_id));

      // Calculate training stats
      const completedTrainings = trainings.filter(t => t.status === 'completed');
      const canceledTrainings = trainings.filter(t => t.status === 'canceled');
      const lateCancellations = canceledTrainings.filter(t => {
        if (!t.canceled_at || !t.date) return false;
        const trainingDate = new Date(t.date);
        const canceledAt = new Date(t.canceled_at);
        return (trainingDate.getTime() - canceledAt.getTime()) < 24 * 60 * 60 * 1000;
      });

      // Calculate days
      const totalDays = differenceInDays(endDate, startDate) + 1;
      // Normalize training dates to YYYY-MM-DD format to avoid timezone issues
      const trainingDates = new Set(completedTrainings.map(t => {
        const dateStr = t.date?.split('T')[0] || format(new Date(t.date), 'yyyy-MM-dd');
        return dateStr;
      }));
      // Ensure activeDays never exceeds totalDays
      const activeDays = Math.min(trainingDates.size, totalDays);

      // Average trainings per week
      const weeks = totalDays / 7;
      const avgTrainingsPerWeek = weeks > 0 ? completedTrainings.length / weeks : 0;

      // Average training price
      const trainingPrices = completedTrainings.filter(t => t.final_price).map(t => t.final_price || 0);
      const avgTrainingPrice = trainingPrices.length > 0 
        ? trainingPrices.reduce((a, b) => a + b, 0) / trainingPrices.length 
        : 0;

      // Most active month
      const monthCounts: Record<string, number> = {};
      const monthIncome: Record<string, number> = {};
      completedTrainings.forEach(t => {
        const month = format(new Date(t.date), 'yyyy-MM');
        monthCounts[month] = (monthCounts[month] || 0) + 1;
        monthIncome[month] = (monthIncome[month] || 0) + (t.final_price || 0);
      });
      const mostActiveMonth = Object.entries(monthCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || '-';

      // Calculate monthly income from credit_transactions for consistent data
      // Group training + canceled_training + product transactions by month
      const monthlyTransactionIncome: Record<string, number> = {};
      creditTransactions.forEach(tx => {
        if (tx.type === 'training' || tx.type === 'canceled_training' || tx.type === 'product') {
          const month = format(new Date(tx.created_at), 'yyyy-MM');
          monthlyTransactionIncome[month] = (monthlyTransactionIncome[month] || 0) + Math.abs(tx.amount);
        }
      });

      // Monthly trend for chart (last 12 months sorted) - use credit_transactions for income
      const monthlyTrend = Object.entries(monthCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([month, trainings]) => ({
          month,
          label: format(new Date(month + '-01'), 'MMM yy'),
          trainings,
          income: monthlyTransactionIncome[month] || 0,
        }));

      // Most active day of week
      const dayCounts: Record<string, number> = {};
      const dayNames = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
      completedTrainings.forEach(t => {
        const day = dayNames[new Date(t.date).getDay()];
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });
      const mostActiveDay = Object.entries(dayCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || '-';

      // Client stats
      const activeClients = clients.filter(c => !c.is_archived);
      const archivedClients = clients.filter(c => c.is_archived);

      // Get training participants for client stats
      const { data: participantsData } = await supabase
        .from('training_participants')
        .select('client_id, price_share, training_sessions!inner(status, date)')
        .gte('training_sessions.date', startStr)
        .lte('training_sessions.date', endStr);

      const participants = participantsData || [];
      
      // Top clients by trainings - combine training_sessions.client_id + training_participants
      const clientTrainingCounts: Record<string, number> = {};
      const clientSpent: Record<string, number> = {};
      const processedTrainingIds = new Set<string>();
      
      // First: count trainings from training_sessions.client_id (single-client trainings)
      completedTrainings.forEach((t: any) => {
        if (t.client_id) {
          clientTrainingCounts[t.client_id] = (clientTrainingCounts[t.client_id] || 0) + 1;
          clientSpent[t.client_id] = (clientSpent[t.client_id] || 0) + (t.final_price || 0);
          processedTrainingIds.add(t.id);
        }
      });
      
      // Second: add multi-client trainings from training_participants (avoid double counting)
      participants.forEach((p: any) => {
        if (p.training_sessions?.status === 'completed' && !processedTrainingIds.has(p.training_sessions?.id)) {
          clientTrainingCounts[p.client_id] = (clientTrainingCounts[p.client_id] || 0) + 1;
          clientSpent[p.client_id] = (clientSpent[p.client_id] || 0) + (p.price_share || 0);
        }
      });

      // Top clients by product purchases
      const productPurchasesByClient: Record<string, { count: number; spent: number }> = {};
      creditTransactions.filter(t => t.type === 'product').forEach(t => {
        if (!productPurchasesByClient[t.client_id]) {
          productPurchasesByClient[t.client_id] = { count: 0, spent: 0 };
        }
        productPurchasesByClient[t.client_id].count += 1;
        productPurchasesByClient[t.client_id].spent += Math.abs(t.amount);
      });

      const clientMap = new Map(clients.map(c => [c.id, c.name]));
      
      const topClientsByTrainings = Object.entries(clientTrainingCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id, count]) => ({ name: clientMap.get(id) || 'Neznámý', count }));

      const topClientsBySpent = Object.entries(clientSpent)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id, amount]) => ({ name: clientMap.get(id) || 'Neznámý', amount }));

      // Top client by products
      const topProductClient = Object.entries(productPurchasesByClient)
        .sort(([, a], [, b]) => b.count - a.count)[0];
      const topClientByProducts = topProductClient 
        ? { 
            name: clientMap.get(topProductClient[0]) || 'Neznámý', 
            count: topProductClient[1].count,
            spent: topProductClient[1].spent 
          }
        : null;

      const avgTrainingsPerClient = clients.length > 0 
        ? completedTrainings.length / activeClients.length 
        : 0;

      // Exercise stats
      const exerciseCounts: Record<string, number> = {};
      exerciseEntries.forEach(e => {
        exerciseCounts[e.exercise_name] = (exerciseCounts[e.exercise_name] || 0) + 1;
      });

      const sortedExercises = Object.entries(exerciseCounts).sort(([, a], [, b]) => b - a);
      const topExercises = sortedExercises.slice(0, 10).map(([name, count]) => ({ name, count }));
      const leastUsedExercises = sortedExercises.slice(-5).reverse().map(([name, count]) => ({ name, count }));

      const totalPRs = exerciseEntries.filter(e => e.is_pr).length;
      
      // Max weight lifted
      const maxWeightEntry = exerciseEntries
        .filter(e => e.weight_kg && e.weight_kg > 0)
        .sort((a, b) => (b.weight_kg || 0) - (a.weight_kg || 0))[0];
      
      const maxWeightLifted = maxWeightEntry ? {
        weight: maxWeightEntry.weight_kg || 0,
        exercise: maxWeightEntry.exercise_name,
        client: clientMap.get(maxWeightEntry.client_id) || 'Neznámý',
      } : null;

      // Finance stats - income from actual services (trainings + canceled trainings + products)
      const productSales = creditTransactions.filter(t => t.type === 'product');
      const productIncome = productSales.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      // Training income includes regular trainings AND canceled training fees
      const trainingCharges = creditTransactions.filter(t => t.type === 'training' || t.type === 'canceled_training');
      const trainingIncome = trainingCharges.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      // Total income = trainings (including cancellation fees) + products
      const totalIncome = trainingIncome + productIncome;

      // KEY METRIC: Received credit from clients (payments/dobití kreditu)
      const paymentTransactions = creditTransactions.filter(t => t.type === 'payment' && t.amount > 0);
      const receivedCredit = paymentTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      // Calculate received credit this month and last month
      const currentMonthStr = format(new Date(), 'yyyy-MM');
      const lastMonthStr = format(subMonths(new Date(), 1), 'yyyy-MM');
      
      const receivedCreditThisMonth = paymentTransactions
        .filter(t => format(new Date(t.created_at), 'yyyy-MM') === currentMonthStr)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const receivedCreditLastMonth = paymentTransactions
        .filter(t => format(new Date(t.created_at), 'yyyy-MM') === lastMonthStr)
        .reduce((sum, t) => sum + t.amount, 0);

      // Actual average training price - use final_price from training_sessions directly
      // This is more accurate than credit_transactions which may include partial payments
      const trainingsWithPrice = completedTrainings.filter(t => t.final_price && t.final_price > 0);
      const avgTrainingPriceActual = trainingsWithPrice.length > 0
        ? trainingsWithPrice.reduce((sum, t) => sum + (t.final_price || 0), 0) / trainingsWithPrice.length
        : 0;
      
      // Calculate trend for average training price (this month vs last month)
      const thisMonthTrainings = completedTrainings.filter(t => 
        format(new Date(t.date), 'yyyy-MM') === currentMonthStr
      );
      const lastMonthTrainings = completedTrainings.filter(t => 
        format(new Date(t.date), 'yyyy-MM') === lastMonthStr
      );
      
      const thisMonthWithPrice = thisMonthTrainings.filter(t => t.final_price && t.final_price > 0);
      const lastMonthWithPrice = lastMonthTrainings.filter(t => t.final_price && t.final_price > 0);
      
      const avgPriceThisMonth = thisMonthWithPrice.length > 0
        ? thisMonthWithPrice.reduce((sum, t) => sum + (t.final_price || 0), 0) / thisMonthWithPrice.length
        : 0;
      const avgPriceLastMonth = lastMonthWithPrice.length > 0
        ? lastMonthWithPrice.reduce((sum, t) => sum + (t.final_price || 0), 0) / lastMonthWithPrice.length
        : 0;
      
      const avgTrainingPriceTrend = avgPriceLastMonth > 0
        ? ((avgPriceThisMonth - avgPriceLastMonth) / avgPriceLastMonth) * 100
        : 0;

      const months = Math.max(1, totalDays / 30);
      const avgMonthlyIncome = totalIncome / months;
      
      // Average for completed months only (exclude current month)
      const currentMonth = format(new Date(), 'yyyy-MM');
      const completedMonthsIncome = Object.entries(monthIncome)
        .filter(([month]) => month !== currentMonth)
        .map(([, income]) => income);
      const avgMonthlyIncomeCompleted = completedMonthsIncome.length > 0
        ? completedMonthsIncome.reduce((a, b) => a + b, 0) / completedMonthsIncome.length
        : avgMonthlyIncome;

      // Pending payments - clients with negative credit_balance (excluding clients in budget groups)
      const pendingClientsWithDetails = clients
        .filter(c => (c.credit_balance ?? 0) < -50 && !clientsInBudgetGroups.has(c.id))
        .map(c => ({
          id: c.id,
          name: c.name,
          balance: c.credit_balance ?? 0,
        }))
        .sort((a, b) => a.balance - b.balance); // Most negative first
      
      const pendingPayments = {
        count: pendingClientsWithDetails.length,
        amount: Math.abs(pendingClientsWithDetails.reduce((sum, c) => sum + c.balance, 0)),
        clients: pendingClientsWithDetails,
      };

      // Top products - count both with product_id and without (fallback to description/amount)
      const productCounts: Record<string, { count: number; revenue: number; name: string }> = {};
      const productMap = new Map(products.map(p => [p.id, p.name]));
      
      // Generic descriptions that should be grouped by amount instead
      const genericDescriptions = ['Nákup z kreditu', 'Platba prodeje', 'Prodej', 'Nákup'];
      
      productSales.forEach(t => {
        let key: string;
        let name: string;
        
        if (t.product_id) {
          // Has product_id - use it
          key = t.product_id;
          name = productMap.get(t.product_id) || 'Neznámý produkt';
        } else if (t.description && !genericDescriptions.some(g => t.description?.includes(g))) {
          // Has specific description - use it
          key = `desc_${t.description}`;
          name = t.description;
        } else {
          // Generic description - group by amount
          key = `amount_${Math.abs(t.amount)}`;
          name = `Položka za ${Math.abs(t.amount)} Kč`;
        }
        
        if (!productCounts[key]) {
          productCounts[key] = { count: 0, revenue: 0, name };
        }
        productCounts[key].count += 1;
        productCounts[key].revenue += Math.abs(t.amount);
      });

      const topProducts = Object.entries(productCounts)
        .sort(([, a], [, b]) => b.revenue - a.revenue)
        .slice(0, 10) // Show more products
        .map(([, data]) => ({ 
          name: data.name, 
          count: data.count, 
          revenue: data.revenue 
        }));

      // Media stats
      const totalPhotos = media.filter(m => m.type === 'photo').length;
      const totalVoiceNotes = media.filter(m => m.type === 'voice_note').length;

      // Feedback stats
      const avgBodyFeel = feedback.length > 0
        ? feedback.reduce((sum, f) => sum + (f.body_feel || 0), 0) / feedback.filter(f => f.body_feel).length
        : 0;
      const avgSessionFit = feedback.length > 0
        ? feedback.reduce((sum, f) => sum + (f.session_fit || 0), 0) / feedback.filter(f => f.session_fit).length
        : 0;

      // Feature usage stats
      const featureCounts: Record<string, number> = {};
      featureUsage.forEach(f => {
        featureCounts[f.feature_name] = (featureCounts[f.feature_name] || 0) + 1;
      });

      const sortedFeatures = Object.entries(featureCounts).sort(([, a], [, b]) => b - a);
      const topFeatures = sortedFeatures.slice(0, 10).map(([name, count]) => ({ name, count }));
      const leastUsedFeatures = sortedFeatures.slice(-5).reverse().map(([name, count]) => ({ name, count }));

      return {
        periodStart: startDate,
        periodEnd: endDate,
        totalDays,
        activeDays,
        
        totalTrainings: trainings.length,
        completedTrainings: completedTrainings.length,
        canceledTrainings: canceledTrainings.length,
        lateCancellations: lateCancellations.length,
        avgTrainingsPerWeek: Math.round(avgTrainingsPerWeek * 10) / 10,
        avgTrainingPrice: Math.round(avgTrainingPrice),
        avgTrainingPriceActual: Math.round(avgTrainingPriceActual),
        avgTrainingPriceTrend: Math.round(avgTrainingPriceTrend * 10) / 10,
        mostActiveMonth,
        mostActiveDay,
        monthlyTrend,
        
        totalClients: clients.length,
        activeClients: activeClients.length,
        archivedClients: archivedClients.length,
        avgTrainingsPerClient: Math.round(avgTrainingsPerClient * 10) / 10,
        topClientsByTrainings,
        topClientsBySpent,
        topClientByProducts,
        
        totalExerciseEntries: exerciseEntries.length,
        uniqueExercises: Object.keys(exerciseCounts).length,
        totalPRs,
        maxWeightLifted,
        topExercises,
        leastUsedExercises,
        
        receivedCredit,
        receivedCreditThisMonth,
        receivedCreditLastMonth,
        totalIncome,
        trainingIncome,
        productIncome,
        avgMonthlyIncome: Math.round(avgMonthlyIncome),
        avgMonthlyIncomeCompleted: Math.round(avgMonthlyIncomeCompleted),
        pendingPayments,
        topProducts,
        
        totalMeasurements: measurements.length,
        totalDiagnostics: diagnostics.length,
        totalPhotos,
        totalVoiceNotes,
        
        totalFeedback: feedback.length,
        avgBodyFeel: Math.round(avgBodyFeel * 10) / 10,
        avgSessionFit: Math.round(avgSessionFit * 10) / 10,
        
        totalFeatureUsage: featureUsage.length,
        topFeatures,
        leastUsedFeatures,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
