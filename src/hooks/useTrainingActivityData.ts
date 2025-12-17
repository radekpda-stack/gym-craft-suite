import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, subMonths, startOfWeek } from 'date-fns';
import { cs } from 'date-fns/locale';
import { TrainingPeriod } from '@/components/dashboard/TrainingActivityChart';
import { useDashboardFilters } from '@/contexts/DashboardFiltersContext';

interface TrainingDataPoint {
  label: string;
  count: number;
  weeklyAvg?: number;
}

export function useTrainingActivityData(period: TrainingPeriod) {
  const { filters } = useDashboardFilters();
  const { accountingMode, clientIds, paymentStatus } = filters;
  
  // Stabilize queryKey
  const clientIdsKey = useMemo(() => clientIds.join(','), [clientIds]);

  return useQuery({
    queryKey: ['training-activity-data', period, accountingMode, clientIdsKey, paymentStatus],
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
      let sessionsQuery = supabase
        .from('training_sessions')
        .select('id, date, status, client_id, payment_status')
        .eq('status', 'completed')
        .gte('date', startDate.toISOString())
        .order('date', { ascending: true });

      // Apply client filter
      if (clientIds.length > 0) {
        sessionsQuery = sessionsQuery.in('client_id', clientIds);
      }

      // Apply payment status filter
      if (paymentStatus === 'paid') {
        sessionsQuery = sessionsQuery.in('payment_status', ['paid_credit', 'paid_cash', 'paid_card', 'paid_bank']);
      } else if (paymentStatus === 'unpaid') {
        sessionsQuery = sessionsQuery.eq('payment_status', 'pending');
      }

      const { data: sessions } = await sessionsQuery;

      // Group data
      const groupedData = new Map<string, number>();

      sessions?.forEach((s) => {
        const date = new Date(s.date);
        let key: string;

        if (groupBy === 'week') {
          const weekStart = startOfWeek(date, { weekStartsOn: 1 });
          key = format(weekStart, 'd.M.');
        } else if (groupBy === 'month') {
          // Use full month name for better display
          key = format(date, 'LLLL', { locale: cs });
          // Capitalize first letter
          key = key.charAt(0).toUpperCase() + key.slice(1);
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