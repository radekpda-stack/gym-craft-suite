import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInMonths, format } from 'date-fns';
import { cs } from 'date-fns/locale';

export interface ClientLTVData {
  totalRevenue: number;
  trainingRevenue: number;
  productRevenue: number;
  creditTopups: number;
  totalTrainings: number;
  avgRevenuePerTraining: number;
  avgRevenuePerMonth: number;
  monthsActive: number;
  firstTrainingDate: string | null;
  lastTrainingDate: string | null;
  projectedAnnualValue: number;
}

export function useClientLTV(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-ltv', clientId],
    queryFn: async (): Promise<ClientLTVData | null> => {
      if (!clientId) return null;

      // Fetch all completed training sessions for the client
      const { data: completedTrainings } = await supabase
        .from('training_sessions')
        .select('id, date, final_price, status')
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .order('date', { ascending: true });

      // Fetch late cancellations (charged) - these count as revenue
      const { data: lateCancellations } = await supabase
        .from('training_sessions')
        .select('id, date, final_price, status, is_late_cancellation, payment_status')
        .eq('client_id', clientId)
        .eq('status', 'canceled')
        .eq('is_late_cancellation', true)
        .order('date', { ascending: true });

      // Fetch credit transactions for products and topups
      const { data: transactions } = await supabase
        .from('credit_transactions')
        .select('id, amount, type, created_at, product_id')
        .eq('client_id', clientId);

      // Combine completed trainings + late cancellations for revenue calculation
      const allChargedSessions = [
        ...(completedTrainings || []),
        ...(lateCancellations || []),
      ];

      // Calculate training revenue (includes late cancellations)
      const trainingRevenue = allChargedSessions.reduce((sum, t) => sum + (t.final_price || 0), 0);
      const totalTrainings = completedTrainings?.length || 0; // Count only completed for "trainings" metric
      const lateCancelCount = lateCancellations?.length || 0;

      // Calculate product revenue (product sales are typically negative transactions from client's perspective)
      const productTransactions = transactions?.filter(t => t.product_id !== null) || [];
      const productRevenue = Math.abs(productTransactions.reduce((sum, t) => sum + (t.amount < 0 ? Math.abs(t.amount) : 0), 0));

      // Calculate credit topups (positive credit_added transactions)
      const topupTransactions = transactions?.filter(t => t.type === 'credit_added' && t.amount > 0) || [];
      const creditTopups = topupTransactions.reduce((sum, t) => sum + t.amount, 0);

      // Total revenue (lifetime) = trainings + products
      const totalRevenue = trainingRevenue + productRevenue;

      // Get first and last training dates (from completed trainings only for timeline)
      const firstTraining = completedTrainings?.[0];
      const lastTraining = completedTrainings?.[completedTrainings.length - 1];
      
      const firstTrainingDate = firstTraining?.date || null;
      const lastTrainingDate = lastTraining?.date || null;

      // Calculate months active (based on first training to now)
      let monthsActive = 1;
      if (firstTrainingDate) {
        monthsActive = Math.max(1, differenceInMonths(new Date(), new Date(firstTrainingDate)) + 1);
      }

      // Averages (for "Průměr/měsíc" we intentionally use trainings only,
      // otherwise product purchases would inflate the value and it wouldn't match "X tréninků × cena")
      const avgRevenuePerTraining = totalTrainings > 0 ? Math.round(trainingRevenue / totalTrainings) : 0;
      const avgTrainingsPerMonth = totalTrainings / Math.max(monthsActive, 1);
      const avgRevenuePerMonth = Math.round(avgTrainingsPerMonth * avgRevenuePerTraining);

      // Projected annual value (based on average monthly training revenue)
      const projectedAnnualValue = avgRevenuePerMonth * 12;

      return {
        totalRevenue,
        trainingRevenue,
        productRevenue,
        creditTopups,
        totalTrainings,
        avgRevenuePerTraining,
        avgRevenuePerMonth,
        monthsActive,
        firstTrainingDate,
        lastTrainingDate,
        projectedAnnualValue,
      };
    },
    enabled: !!clientId,
  });
}
