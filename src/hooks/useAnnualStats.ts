import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfYear, endOfYear, subMonths, format, differenceInDays } from 'date-fns';

export type StatsPeriod = 'all' | 'year' | 'custom';

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
  mostActiveMonth: string;
  mostActiveDay: string;
  
  // Clients
  totalClients: number;
  activeClients: number;
  archivedClients: number;
  avgTrainingsPerClient: number;
  topClientsByTrainings: Array<{ name: string; count: number }>;
  topClientsBySpent: Array<{ name: string; amount: number }>;
  
  // Exercises & PRs
  totalExerciseEntries: number;
  uniqueExercises: number;
  totalPRs: number;
  maxWeightLifted: { weight: number; exercise: string; client: string } | null;
  topExercises: Array<{ name: string; count: number }>;
  leastUsedExercises: Array<{ name: string; count: number }>;
  
  // Finance
  totalIncome: number;
  trainingIncome: number;
  productIncome: number;
  avgMonthlyIncome: number;
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
      ] = await Promise.all([
        // Trainings
        supabase
          .from('training_sessions')
          .select('id, date, status, payment_status, final_price, canceled_at')
          .eq('user_id', user.id)
          .gte('date', startStr)
          .lte('date', endStr),
        
        // Clients
        supabase
          .from('clients')
          .select('id, name, is_archived, created_at')
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
          .select('id, amount, type, client_id, product_id, created_at')
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
      const trainingDates = new Set(completedTrainings.map(t => t.date));
      const activeDays = trainingDates.size;

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
      completedTrainings.forEach(t => {
        const month = format(new Date(t.date), 'yyyy-MM');
        monthCounts[month] = (monthCounts[month] || 0) + 1;
      });
      const mostActiveMonth = Object.entries(monthCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || '-';

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
      
      // Top clients by trainings
      const clientTrainingCounts: Record<string, number> = {};
      const clientSpent: Record<string, number> = {};
      participants.forEach((p: any) => {
        if (p.training_sessions?.status === 'completed') {
          clientTrainingCounts[p.client_id] = (clientTrainingCounts[p.client_id] || 0) + 1;
          clientSpent[p.client_id] = (clientSpent[p.client_id] || 0) + (p.price_share || 0);
        }
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

      // Finance stats
      const deposits = creditTransactions.filter(t => t.type === 'deposit');
      const totalIncome = deposits.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const productSales = creditTransactions.filter(t => t.type === 'product_sale');
      const productIncome = productSales.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const trainingCharges = creditTransactions.filter(t => t.type === 'training_charge');
      const trainingIncome = trainingCharges.reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const months = Math.max(1, totalDays / 30);
      const avgMonthlyIncome = totalIncome / months;

      // Top products
      const productCounts: Record<string, { count: number; revenue: number }> = {};
      productSales.forEach(t => {
        if (t.product_id) {
          if (!productCounts[t.product_id]) {
            productCounts[t.product_id] = { count: 0, revenue: 0 };
          }
          productCounts[t.product_id].count += 1;
          productCounts[t.product_id].revenue += Math.abs(t.amount);
        }
      });

      const productMap = new Map(products.map(p => [p.id, p.name]));
      const topProducts = Object.entries(productCounts)
        .sort(([, a], [, b]) => b.revenue - a.revenue)
        .slice(0, 5)
        .map(([id, data]) => ({ 
          name: productMap.get(id) || 'Neznámý', 
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
        mostActiveMonth,
        mostActiveDay,
        
        totalClients: clients.length,
        activeClients: activeClients.length,
        archivedClients: archivedClients.length,
        avgTrainingsPerClient: Math.round(avgTrainingsPerClient * 10) / 10,
        topClientsByTrainings,
        topClientsBySpent,
        
        totalExerciseEntries: exerciseEntries.length,
        uniqueExercises: Object.keys(exerciseCounts).length,
        totalPRs,
        maxWeightLifted,
        topExercises,
        leastUsedExercises,
        
        totalIncome,
        trainingIncome,
        productIncome,
        avgMonthlyIncome: Math.round(avgMonthlyIncome),
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
