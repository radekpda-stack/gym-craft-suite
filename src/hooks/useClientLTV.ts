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

      // Fetch all training sessions for the client
      const { data: trainings } = await supabase
        .from('training_sessions')
        .select('id, date, final_price, status')
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .order('date', { ascending: true });

      // Fetch credit transactions for products and topups
      const { data: transactions } = await supabase
        .from('credit_transactions')
        .select('id, amount, type, created_at, product_id')
        .eq('client_id', clientId);

      // Calculate training revenue
      const trainingRevenue = trainings?.reduce((sum, t) => sum + (t.final_price || 0), 0) || 0;
      const totalTrainings = trainings?.length || 0;

      // Calculate product revenue (product sales are typically negative transactions from client's perspective)
      const productTransactions = transactions?.filter(t => t.product_id !== null) || [];
      const productRevenue = Math.abs(productTransactions.reduce((sum, t) => sum + (t.amount < 0 ? Math.abs(t.amount) : 0), 0));

      // Calculate credit topups (positive credit_added transactions)
      const topupTransactions = transactions?.filter(t => t.type === 'credit_added' && t.amount > 0) || [];
      const creditTopups = topupTransactions.reduce((sum, t) => sum + t.amount, 0);

      // Total revenue (trainings + products)
      const totalRevenue = trainingRevenue + productRevenue;

      // Get first and last training dates
      const firstTraining = trainings?.[0];
      const lastTraining = trainings?.[trainings.length - 1];
      
      const firstTrainingDate = firstTraining?.date || null;
      const lastTrainingDate = lastTraining?.date || null;

      // Calculate months active (based on first training to now)
      let monthsActive = 1;
      if (firstTrainingDate) {
        monthsActive = Math.max(1, differenceInMonths(new Date(), new Date(firstTrainingDate)) + 1);
      }

      // Average per training
      const avgRevenuePerTraining = totalTrainings > 0 ? Math.round(totalRevenue / totalTrainings) : 0;
      
      // Average trainings per month
      const avgTrainingsPerMonth = totalTrainings / Math.max(monthsActive, 1);
      
      // Average revenue per month = average trainings per month × average price per training
      // This correctly reflects: if client does 5 trainings/month at 800 Kč = 4000 Kč/month
      const avgRevenuePerMonth = Math.round(avgTrainingsPerMonth * avgRevenuePerTraining);

      // Projected annual value (based on average monthly revenue)
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
