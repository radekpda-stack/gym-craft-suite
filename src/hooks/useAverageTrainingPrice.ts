import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfMonth, format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';

export interface MonthlyPriceData {
  month: string;
  label: string;
  avgPrice: number;
  trainings: number;
  income: number;
}

export interface AverageTrainingPriceStats {
  avgPrice: number;
  totalTrainings: number;
  totalIncome: number;
  monthlyData: MonthlyPriceData[];
  trend: number; // difference between last 2 months
}

export function useAverageTrainingPrice() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['average-training-price', user?.id],
    queryFn: async (): Promise<AverageTrainingPriceStats> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Fetch all completed trainings with their prices
      const { data: trainings, error } = await supabase
        .from('training_sessions')
        .select('id, date, final_price')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .not('final_price', 'is', null)
        .order('date', { ascending: true });

      if (error) throw error;

      if (!trainings || trainings.length === 0) {
        return {
          avgPrice: 0,
          totalTrainings: 0,
          totalIncome: 0,
          monthlyData: [],
          trend: 0,
        };
      }

      // Calculate totals
      const totalIncome = trainings.reduce((sum, t) => sum + (t.final_price || 0), 0);
      const totalTrainings = trainings.length;
      const avgPrice = totalTrainings > 0 ? Math.round(totalIncome / totalTrainings) : 0;

      // Aggregate by month
      const monthlyMap = new Map<string, MonthlyPriceData>();
      trainings.forEach(t => {
        const date = parseISO(t.date);
        const monthKey = format(startOfMonth(date), 'yyyy-MM');
        const monthLabel = format(date, 'LLL yy', { locale: cs });
        
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, {
            month: monthKey,
            label: monthLabel,
            avgPrice: 0,
            trainings: 0,
            income: 0,
          });
        }
        
        const data = monthlyMap.get(monthKey)!;
        data.trainings++;
        data.income += t.final_price || 0;
      });

      // Calculate average for each month
      monthlyMap.forEach((data) => {
        data.avgPrice = data.trainings > 0 ? Math.round(data.income / data.trainings) : 0;
      });

      const monthlyData = Array.from(monthlyMap.values())
        .sort((a, b) => a.month.localeCompare(b.month));

      // Calculate trend (last 2 months)
      const recentMonths = monthlyData.slice(-2);
      const trend = recentMonths.length === 2
        ? recentMonths[1].avgPrice - recentMonths[0].avgPrice
        : 0;

      return {
        avgPrice,
        totalTrainings,
        totalIncome,
        monthlyData,
        trend,
      };
    },
    enabled: !!user?.id,
  });
}
