import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, format, differenceInDays, subDays } from 'date-fns';
import { cs } from 'date-fns/locale';

export interface CashflowForecastData {
  thisWeek: {
    expected: number;
    trainingsCount: number;
  };
  nextWeek: {
    expected: number;
    trainingsCount: number;
  };
  thisMonth: {
    expected: number;
    actual: number;
    remaining: number;
  };
  receivables: {
    total: number;
    byAge: {
      days0to7: { count: number; amount: number };
      days8to30: { count: number; amount: number };
      days31plus: { count: number; amount: number };
    };
  };
}

export function useCashflowForecast() {
  return useQuery({
    queryKey: ['cashflow-forecast'],
    queryFn: async (): Promise<CashflowForecastData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
      const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const nextWeekStart = addWeeks(thisWeekStart, 1);
      const nextWeekEnd = addWeeks(thisWeekEnd, 1);
      const thisMonthStart = startOfMonth(now);
      const thisMonthEnd = endOfMonth(now);

      const thisWeekResult = await supabase
        .from('training_sessions')
        .select('id, final_price, base_price, status')
        .eq('user_id', user.id)
        .gte('date', thisWeekStart.toISOString())
        .lte('date', thisWeekEnd.toISOString())
        .in('status', ['scheduled', 'completed']);
      const nextWeekResult = await supabase
        .from('training_sessions')
        .select('id, final_price, base_price, status')
        .eq('user_id', user.id)
        .gte('date', nextWeekStart.toISOString())
        .lte('date', nextWeekEnd.toISOString())
        .in('status', ['scheduled', 'completed']);
      const thisMonthScheduledResult = await supabase
        .from('training_sessions')
        .select('id, final_price, base_price, status')
        .eq('user_id', user.id)
        .gte('date', thisMonthStart.toISOString())
        .lte('date', thisMonthEnd.toISOString())
        .in('status', ['scheduled', 'completed']);
      const thisMonthCompletedResult = await supabase
        .from('training_sessions')
        .select('id, final_price')
        .eq('user_id', user.id)
        .gte('date', thisMonthStart.toISOString())
        .lte('date', thisMonthEnd.toISOString())
        .eq('status', 'completed');
      const unpaidResult = await supabase
        .from('training_sessions')
        .select('id, final_price, date')
        .eq('user_id', user.id)
        .is('is_paid', false);

      const thisWeekTrainings = thisWeekResult.data || [];
      const nextWeekTrainings = nextWeekResult.data || [];
      const thisMonthScheduled = thisMonthScheduledResult.data || [];
      const thisMonthCompleted = thisMonthCompletedResult.data || [];
      const unpaidTrainings = unpaidResult.data || [];

      // Calculate expected income (use final_price if available, else base_price)
      const calcExpected = (trainings: any[]) => 
        trainings.reduce((sum, t) => sum + (t.final_price || t.base_price || 0), 0);

      const thisWeekExpected = calcExpected(thisWeekTrainings);
      const nextWeekExpected = calcExpected(nextWeekTrainings);
      const thisMonthExpected = calcExpected(thisMonthScheduled);
      const thisMonthActual = thisMonthCompleted.reduce((sum, t) => sum + (t.final_price || 0), 0);

      // Receivables by age
      const receivablesByAge = {
        days0to7: { count: 0, amount: 0 },
        days8to30: { count: 0, amount: 0 },
        days31plus: { count: 0, amount: 0 },
      };

      unpaidTrainings.forEach(t => {
        const daysOld = differenceInDays(now, new Date(t.date));
        const amount = t.final_price || 0;
        
        if (daysOld <= 7) {
          receivablesByAge.days0to7.count++;
          receivablesByAge.days0to7.amount += amount;
        } else if (daysOld <= 30) {
          receivablesByAge.days8to30.count++;
          receivablesByAge.days8to30.amount += amount;
        } else {
          receivablesByAge.days31plus.count++;
          receivablesByAge.days31plus.amount += amount;
        }
      });

      const totalReceivables = unpaidTrainings.reduce((sum, t) => sum + (t.final_price || 0), 0);

      return {
        thisWeek: {
          expected: thisWeekExpected,
          trainingsCount: thisWeekTrainings.length,
        },
        nextWeek: {
          expected: nextWeekExpected,
          trainingsCount: nextWeekTrainings.length,
        },
        thisMonth: {
          expected: thisMonthExpected,
          actual: thisMonthActual,
          remaining: thisMonthExpected - thisMonthActual,
        },
        receivables: {
          total: totalReceivables,
          byAge: receivablesByAge,
        },
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
