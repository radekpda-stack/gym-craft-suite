import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, subMonths, startOfWeek, endOfWeek, eachWeekOfInterval } from 'date-fns';
import { cs } from 'date-fns/locale';
import { TrainingPeriod } from '@/components/dashboard/TrainingActivityChart';

interface TrainingDataPoint {
  label: string;
  count: number;
  weeklyAvg?: number;
}

export function useTrainingActivityData(period: TrainingPeriod) {
  return useQuery({
    queryKey: ['training-activity-data', period],
    queryFn: async () => {
      const now = new Date();
      let startDate: Date;
      let groupBy: 'day' | 'week' | 'month';

      switch (period) {
        case '30days':
          startDate = subDays(now, 30);
          groupBy = 'week';
          break;
        case '6months':
          startDate = subMonths(now, 6);
          groupBy = 'month';
          break;
        case '12months':
          startDate = subMonths(now, 12);
          groupBy = 'month';
          break;
        default:
          startDate = subDays(now, 30);
          groupBy = 'week';
      }

      // Fetch completed training sessions
      const { data: sessions } = await supabase
        .from('training_sessions')
        .select('id, date, status')
        .eq('status', 'completed')
        .gte('date', startDate.toISOString())
        .order('date', { ascending: true });

      // Group data
      const groupedData = new Map<string, number>();

      sessions?.forEach((s) => {
        const date = new Date(s.date);
        let key: string;

        if (groupBy === 'week') {
          const weekStart = startOfWeek(date, { weekStartsOn: 1 });
          key = format(weekStart, 'd.M.');
        } else if (groupBy === 'month') {
          key = format(date, 'MMM', { locale: cs });
        } else {
          key = format(date, 'd.M.');
        }

        groupedData.set(key, (groupedData.get(key) || 0) + 1);
      });

      // Calculate weekly averages for each group
      const result: TrainingDataPoint[] = [];
      
      if (groupBy === 'month') {
        groupedData.forEach((count, label) => {
          result.push({
            label,
            count,
            weeklyAvg: Math.round((count / 4) * 10) / 10, // Approx 4 weeks per month
          });
        });
      } else {
        groupedData.forEach((count, label) => {
          result.push({
            label,
            count,
            weeklyAvg: count, // Weekly data, so same as count
          });
        });
      }

      return result;
    },
  });
}
