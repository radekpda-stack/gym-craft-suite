import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, subMonths, endOfMonth, format } from 'date-fns';
import { cs } from 'date-fns/locale';

export interface ForecastPoint {
  month: string;
  label: string;
  revenue: number;
  forecast: number | null;
  expenses: number;
  profit: number;
}

export interface RevenueForecastData {
  points: ForecastPoint[];
  annualProjection: number;
  avgMonthlyRevenue: number;
  avgMonthlyExpenses: number;
  breakEvenTrainings: number; // how many trainings needed to cover expenses
}

export function useRevenueForecast() {
  return useQuery({
    queryKey: ['revenue-forecast'],
    queryFn: async (): Promise<RevenueForecastData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const monthsBack = 6;
      const startDate = startOfMonth(subMonths(now, monthsBack - 1));

      const [trainingsRes, expensesRes] = await Promise.all([
        supabase
          .from('training_sessions')
          .select('date, final_price')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('date', startDate.toISOString()),
        supabase
          .from('business_expenses')
          .select('amount, date')
          .eq('user_id', user.id)
          .gte('date', format(startDate, 'yyyy-MM-dd')),
      ]);

      const trainings = trainingsRes.data || [];
      const expenses = expensesRes.data || [];

      const points: ForecastPoint[] = [];
      const revenues: number[] = [];
      const expenseAmounts: number[] = [];

      for (let i = monthsBack - 1; i >= 0; i--) {
        const mStart = startOfMonth(subMonths(now, i));
        const mEnd = endOfMonth(mStart);
        const mKey = format(mStart, 'yyyy-MM');

        const rev = trainings
          .filter(t => format(new Date(t.date), 'yyyy-MM') === mKey)
          .reduce((s, t) => s + (t.final_price || 0), 0);
        const exp = expenses
          .filter(e => format(new Date(e.date), 'yyyy-MM') === mKey)
          .reduce((s, e) => s + e.amount, 0);

        revenues.push(rev);
        expenseAmounts.push(exp);

        points.push({
          month: mKey,
          label: format(mStart, 'MMM', { locale: cs }),
          revenue: rev,
          forecast: null,
          expenses: exp,
          profit: rev - exp,
        });
      }

      // Linear regression for forecast
      const n = revenues.length;
      const avgRev = revenues.reduce((a, b) => a + b, 0) / n;
      const avgExp = expenseAmounts.reduce((a, b) => a + b, 0) / n;

      // Simple linear trend
      let sumXY = 0, sumX2 = 0;
      revenues.forEach((r, i) => {
        sumXY += (i - (n - 1) / 2) * (r - avgRev);
        sumX2 += (i - (n - 1) / 2) ** 2;
      });
      const slope = sumX2 > 0 ? sumXY / sumX2 : 0;

      // Add 3 forecast months
      for (let i = 1; i <= 3; i++) {
        const mStart = startOfMonth(subMonths(now, -i));
        const forecastRev = Math.max(0, Math.round(avgRev + slope * (n - 1 + i - (n - 1) / 2)));
        points.push({
          month: format(mStart, 'yyyy-MM'),
          label: format(mStart, 'MMM', { locale: cs }),
          revenue: 0,
          forecast: forecastRev,
          expenses: Math.round(avgExp),
          profit: forecastRev - Math.round(avgExp),
        });
      }

      // Annual projection from last 3 actual months
      const last3Rev = revenues.slice(-3);
      const last3Avg = last3Rev.reduce((a, b) => a + b, 0) / 3;
      const annualProjection = Math.round(last3Avg * 12);

      // Break-even: how many trainings at current avg price to cover avg expenses
      const avgPrice = trainings.length > 0
        ? trainings.reduce((s, t) => s + (t.final_price || 0), 0) / trainings.length
        : 0;
      const breakEvenTrainings = avgPrice > 0 ? Math.ceil(avgExp / avgPrice) : 0;

      return {
        points,
        annualProjection,
        avgMonthlyRevenue: Math.round(avgRev),
        avgMonthlyExpenses: Math.round(avgExp),
        breakEvenTrainings,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
