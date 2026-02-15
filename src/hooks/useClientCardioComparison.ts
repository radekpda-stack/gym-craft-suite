import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { subDays, format } from 'date-fns';
import type { AnalyticsPeriod } from './useExerciseAnalyticsComplete';

export interface CardioClientStats {
  clientId: string;
  clientName: string;
  totalDurationSec: number;
  totalDistanceM: number;
  avgWatts: number;
  avgHeartRate: number;
  entryCount: number;
}

export function useClientCardioComparison(period: AnalyticsPeriod = 30) {
  const { user } = useAuth();
  const days = period === 'custom' ? 90 : period;

  return useQuery({
    queryKey: ['client-cardio-comparison', user?.id, days],
    queryFn: async (): Promise<CardioClientStats[]> => {
      if (!user?.id) return [];

      const dateStr = format(subDays(new Date(), days), 'yyyy-MM-dd');

      const { data: entries } = await supabase
        .from('cardio_entries')
        .select('client_id, duration_seconds, distance_meters, avg_watts, avg_heart_rate')
        .eq('user_id', user.id)
        .gte('date', dateStr);

      const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', user.id);

      const clientMap = new Map(clients?.map(c => [c.id, c.name]) || []);
      const statsMap = new Map<string, { dur: number; dist: number; wattsSum: number; wattsCount: number; hrSum: number; hrCount: number; count: number }>();

      (entries || []).forEach(e => {
        if (!e.client_id) return;
        if (!statsMap.has(e.client_id)) {
          statsMap.set(e.client_id, { dur: 0, dist: 0, wattsSum: 0, wattsCount: 0, hrSum: 0, hrCount: 0, count: 0 });
        }
        const s = statsMap.get(e.client_id)!;
        s.dur += e.duration_seconds || 0;
        s.dist += e.distance_meters || 0;
        if (e.avg_watts) { s.wattsSum += e.avg_watts; s.wattsCount++; }
        if (e.avg_heart_rate) { s.hrSum += e.avg_heart_rate; s.hrCount++; }
        s.count++;
      });

      return Array.from(statsMap.entries())
        .map(([id, s]) => ({
          clientId: id,
          clientName: clientMap.get(id) || 'Neznámý',
          totalDurationSec: s.dur,
          totalDistanceM: s.dist,
          avgWatts: s.wattsCount > 0 ? Math.round(s.wattsSum / s.wattsCount) : 0,
          avgHeartRate: s.hrCount > 0 ? Math.round(s.hrSum / s.hrCount) : 0,
          entryCount: s.count,
        }))
        .sort((a, b) => b.entryCount - a.entryCount);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
