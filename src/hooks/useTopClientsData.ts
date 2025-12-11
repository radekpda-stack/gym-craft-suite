import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, subMonths } from 'date-fns';
import { ClientsPeriod } from '@/components/dashboard/TopClientsRanking';

interface TopClient {
  id: string;
  name: string;
  trainingsCount: number;
  revenue: number;
  lastTraining?: string;
}

export function useTopClientsData(period: ClientsPeriod, limit: number = 10) {
  return useQuery({
    queryKey: ['top-clients-data', period, limit],
    queryFn: async () => {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case '30days':
          startDate = subDays(now, 30);
          break;
        case '6months':
          startDate = subMonths(now, 6);
          break;
        case '12months':
          startDate = subMonths(now, 12);
          break;
        default:
          startDate = subDays(now, 30);
      }

      // Fetch clients with their training sessions
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .eq('is_archived', false);

      // Fetch training sessions in period
      const { data: sessions } = await supabase
        .from('training_sessions')
        .select('id, client_id, date, final_price, status')
        .eq('status', 'completed')
        .gte('date', startDate.toISOString());

      // Aggregate by client
      const clientStats = new Map<
        string,
        { count: number; revenue: number; lastTraining?: string }
      >();

      sessions?.forEach((s) => {
        if (!clientStats.has(s.client_id)) {
          clientStats.set(s.client_id, { count: 0, revenue: 0 });
        }
        const stats = clientStats.get(s.client_id)!;
        stats.count += 1;
        stats.revenue += s.final_price || 0;

        // Track latest training
        if (!stats.lastTraining || new Date(s.date) > new Date(stats.lastTraining)) {
          stats.lastTraining = s.date;
        }
      });

      // Combine with client names
      const result: TopClient[] = [];
      clients?.forEach((c) => {
        const stats = clientStats.get(c.id);
        if (stats && stats.count > 0) {
          result.push({
            id: c.id,
            name: c.name,
            trainingsCount: stats.count,
            revenue: stats.revenue,
            lastTraining: stats.lastTraining,
          });
        }
      });

      // Sort by training count
      result.sort((a, b) => b.trainingsCount - a.trainingsCount);

      return result.slice(0, limit);
    },
  });
}
