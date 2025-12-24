import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfYear, endOfYear, startOfMonth, endOfMonth, subYears, format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface YearOverYearData {
  label: string;
  currentYear: number;
  lastYear: number;
  difference: number;
  percentChange: number;
}

export interface YearOverYearStats {
  trainings: YearOverYearData;
  income: YearOverYearData;
  newClients: YearOverYearData;
  monthlyComparison: {
    month: string;
    currentYear: number;
    lastYear: number;
  }[];
  currentYearTotal: {
    trainings: number;
    income: number;
  };
  lastYearTotal: {
    trainings: number;
    income: number;
  };
}

export function useYearOverYearStats() {
  return useQuery({
    queryKey: ['year-over-year-stats'],
    queryFn: async (): Promise<YearOverYearStats> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const now = new Date();
      const currentYear = now.getFullYear();
      const lastYear = currentYear - 1;

      const currentYearStart = startOfYear(now);
      const currentYearEnd = now; // up to today
      const lastYearStart = startOfYear(subYears(now, 1));

      // For fair comparison, use same period in both years (Jan 1 to today's date)
      const lastYearSamePeriodEnd = new Date(lastYear, now.getMonth(), now.getDate());

      // Fetch training sessions for both years - filtered by user_id
      const { data: currentYearTrainings } = await supabase
        .from('training_sessions')
        .select('id, date, final_price')
        .eq('user_id', user.id)
        .gte('date', currentYearStart.toISOString().split('T')[0])
        .lte('date', currentYearEnd.toISOString().split('T')[0])
        .eq('status', 'completed');

      const { data: lastYearTrainings } = await supabase
        .from('training_sessions')
        .select('id, date, final_price')
        .eq('user_id', user.id)
        .gte('date', lastYearStart.toISOString().split('T')[0])
        .lte('date', lastYearSamePeriodEnd.toISOString().split('T')[0])
        .eq('status', 'completed');

      // Fetch clients created in both years - filtered by user_id
      const { data: currentYearClients } = await supabase
        .from('clients')
        .select('id, created_at')
        .eq('user_id', user.id)
        .gte('created_at', currentYearStart.toISOString())
        .lte('created_at', currentYearEnd.toISOString());

      const { data: lastYearClients } = await supabase
        .from('clients')
        .select('id, created_at')
        .eq('user_id', user.id)
        .gte('created_at', lastYearStart.toISOString())
        .lte('created_at', lastYearSamePeriodEnd.toISOString());

      // Calculate totals
      const currentTrainingsCount = currentYearTrainings?.length || 0;
      const lastTrainingsCount = lastYearTrainings?.length || 0;

      const currentIncome = currentYearTrainings?.reduce((sum, t) => sum + (t.final_price || 0), 0) || 0;
      const lastIncome = lastYearTrainings?.reduce((sum, t) => sum + (t.final_price || 0), 0) || 0;

      const currentNewClients = currentYearClients?.length || 0;
      const lastNewClients = lastYearClients?.length || 0;

      // Calculate monthly comparison (trainings per month)
      const monthlyComparison: { month: string; currentYear: number; lastYear: number }[] = [];
      
      for (let m = 0; m <= now.getMonth(); m++) {
        const monthStart = startOfMonth(new Date(currentYear, m, 1));
        const monthEnd = endOfMonth(new Date(currentYear, m, 1));
        const lastYearMonthStart = startOfMonth(new Date(lastYear, m, 1));
        const lastYearMonthEnd = endOfMonth(new Date(lastYear, m, 1));

        const currentMonthCount = currentYearTrainings?.filter(t => {
          const d = new Date(t.date);
          return d >= monthStart && d <= monthEnd;
        }).length || 0;

        const lastMonthCount = lastYearTrainings?.filter(t => {
          const d = new Date(t.date);
          return d >= lastYearMonthStart && d <= lastYearMonthEnd;
        }).length || 0;

        monthlyComparison.push({
          month: format(monthStart, 'LLL', { locale: cs }),
          currentYear: currentMonthCount,
          lastYear: lastMonthCount,
        });
      }

      // Helper to calculate stats
      const calcStats = (current: number, last: number, label: string): YearOverYearData => ({
        label,
        currentYear: current,
        lastYear: last,
        difference: current - last,
        percentChange: last > 0 ? Math.round(((current - last) / last) * 100) : (current > 0 ? 100 : 0),
      });

      return {
        trainings: calcStats(currentTrainingsCount, lastTrainingsCount, 'Tréninky'),
        income: calcStats(currentIncome, lastIncome, 'Příjmy'),
        newClients: calcStats(currentNewClients, lastNewClients, 'Noví klienti'),
        monthlyComparison,
        currentYearTotal: { trainings: currentTrainingsCount, income: currentIncome },
        lastYearTotal: { trainings: lastTrainingsCount, income: lastIncome },
      };
    },
  });
}
