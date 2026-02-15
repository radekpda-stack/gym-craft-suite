import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { subDays, format } from 'date-fns';
import type { AnalyticsPeriod } from './useExerciseAnalyticsComplete';

export interface SkillClientStats {
  clientId: string;
  clientName: string;
  entryCount: number;
  uniqueExercises: number;
}

export function useClientSkillComparison(period: AnalyticsPeriod = 30) {
  const { user } = useAuth();
  const days = period === 'custom' ? 90 : period;

  return useQuery({
    queryKey: ['client-skill-comparison', user?.id, days],
    queryFn: async (): Promise<SkillClientStats[]> => {
      if (!user?.id) return [];

      const dateStr = format(subDays(new Date(), days), 'yyyy-MM-dd');

      const { data: entries } = await supabase
        .from('skill_entries')
        .select('client_id, exercise_name')
        .eq('user_id', user.id)
        .gte('date', dateStr);

      const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', user.id);

      const clientMap = new Map(clients?.map(c => [c.id, c.name]) || []);
      const statsMap = new Map<string, { count: number; exercises: Set<string> }>();

      (entries || []).forEach(e => {
        if (!e.client_id) return;
        if (!statsMap.has(e.client_id)) {
          statsMap.set(e.client_id, { count: 0, exercises: new Set() });
        }
        const s = statsMap.get(e.client_id)!;
        s.count++;
        s.exercises.add(e.exercise_name);
      });

      return Array.from(statsMap.entries())
        .map(([id, s]) => ({
          clientId: id,
          clientName: clientMap.get(id) || 'Neznámý',
          entryCount: s.count,
          uniqueExercises: s.exercises.size,
        }))
        .sort((a, b) => b.entryCount - a.entryCount);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
