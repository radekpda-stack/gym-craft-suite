import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format, differenceInDays } from 'date-fns';
import type { StatsPeriodRange } from '@/components/statistics/StatsPeriodSelector';

export interface PeriodComparisonData {
  current: {
    trainings: number;
    income: number;
    activeClients: number;
  };
  previous: {
    trainings: number;
    income: number;
    activeClients: number;
  };
  changes: {
    trainings: number; // percentage
    income: number;
    activeClients: number;
  };
  periodLabel: string;
  previousPeriodLabel: string;
}

export function usePeriodComparison(periodRange: StatsPeriodRange | undefined) {
  return useQuery({
    queryKey: ['period-comparison', periodRange?.start?.toISOString(), periodRange?.end?.toISOString()],
    queryFn: async (): Promise<PeriodComparisonData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Calculate current and previous periods
      const end = periodRange?.end || new Date();
      const start = periodRange?.start || subDays(end, 30);
      const periodDays = differenceInDays(end, start);
      
      const previousEnd = subDays(start, 1);
      const previousStart = subDays(previousEnd, periodDays);

      const currentStartStr = format(start, 'yyyy-MM-dd');
      const currentEndStr = format(end, 'yyyy-MM-dd');
      const previousStartStr = format(previousStart, 'yyyy-MM-dd');
      const previousEndStr = format(previousEnd, 'yyyy-MM-dd');

      // Fetch data in parallel
      const [currentTrainings, previousTrainings, currentTransactions, previousTransactions] = await Promise.all([
        // Current period trainings
        supabase
          .from('training_sessions')
          .select('id, client_id, final_price')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('date', currentStartStr)
          .lte('date', currentEndStr),
        
        // Previous period trainings
        supabase
          .from('training_sessions')
          .select('id, client_id, final_price')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('date', previousStartStr)
          .lte('date', previousEndStr),
        
        // Current period income
        supabase
          .from('credit_transactions')
          .select('amount, type')
          .eq('user_id', user.id)
          .in('type', ['training', 'canceled_training', 'product'])
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString()),
        
        // Previous period income
        supabase
          .from('credit_transactions')
          .select('amount, type')
          .eq('user_id', user.id)
          .in('type', ['training', 'canceled_training', 'product'])
          .gte('created_at', previousStart.toISOString())
          .lte('created_at', previousEnd.toISOString()),
      ]);

      const currentTrainingData = currentTrainings.data || [];
      const previousTrainingData = previousTrainings.data || [];

      // Calculate metrics
      const currentTrainingsCount = currentTrainingData.length;
      const previousTrainingsCount = previousTrainingData.length;

      const currentIncome = (currentTransactions.data || []).reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const previousIncome = (previousTransactions.data || []).reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const currentActiveClients = new Set(currentTrainingData.map(t => t.client_id)).size;
      const previousActiveClients = new Set(previousTrainingData.map(t => t.client_id)).size;

      // Calculate percentage changes
      const calculateChange = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      return {
        current: {
          trainings: currentTrainingsCount,
          income: currentIncome,
          activeClients: currentActiveClients,
        },
        previous: {
          trainings: previousTrainingsCount,
          income: previousIncome,
          activeClients: previousActiveClients,
        },
        changes: {
          trainings: calculateChange(currentTrainingsCount, previousTrainingsCount),
          income: calculateChange(currentIncome, previousIncome),
          activeClients: calculateChange(currentActiveClients, previousActiveClients),
        },
        periodLabel: periodRange?.label || 'Aktuální období',
        previousPeriodLabel: `${format(previousStart, 'd.M.')} - ${format(previousEnd, 'd.M.')}`,
      };
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!periodRange,
  });
}
