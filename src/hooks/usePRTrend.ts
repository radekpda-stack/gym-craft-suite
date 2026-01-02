import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfYear, endOfYear, format, subMonths } from 'date-fns';

export interface PRTrendPoint {
  month: string;
  label: string;
  count: number;
}

export function usePRTrend(months: number = 6) {
  return useQuery({
    queryKey: ['pr-trend', months],
    queryFn: async (): Promise<PRTrendPoint[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const endDate = new Date();
      const startDate = subMonths(endDate, months);
      
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      const { data: entries, error } = await supabase
        .from('exercise_entries')
        .select('id, date, is_pr')
        .eq('user_id', user.id)
        .eq('is_pr', true)
        .gte('date', startStr)
        .lte('date', endStr);

      if (error || !entries) return [];

      // Group by month
      const monthCounts: Record<string, number> = {};
      
      entries.forEach(entry => {
        const month = format(new Date(entry.date), 'yyyy-MM');
        monthCounts[month] = (monthCounts[month] || 0) + 1;
      });

      // Fill in missing months with 0
      const result: PRTrendPoint[] = [];
      for (let i = months - 1; i >= 0; i--) {
        const date = subMonths(endDate, i);
        const monthKey = format(date, 'yyyy-MM');
        const label = format(date, 'MMM');
        
        result.push({
          month: monthKey,
          label,
          count: monthCounts[monthKey] || 0,
        });
      }

      return result;
    },
  });
}
