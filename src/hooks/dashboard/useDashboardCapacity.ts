import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay } from 'date-fns';
import type { CapacityInfo, TrainingSessionRow } from './types';

/**
 * Hook for fetching today's capacity data
 */
export function useDashboardCapacity() {
  return useQuery({
    queryKey: ['dashboard-capacity'],
    queryFn: async (): Promise<CapacityInfo> => {
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);

      const { data, error } = await supabase
        .from('training_sessions')
        .select('id, status')
        .gte('date', todayStart.toISOString())
        .lte('date', todayEnd.toISOString());

      if (error) throw error;

      const trainings = (data || []) as TrainingSessionRow[];
      const completed = trainings.filter(t => t.status === 'completed').length;
      const scheduled = trainings.filter(t => t.status === 'scheduled').length;
      const total = completed + scheduled;

      return {
        completed,
        scheduled,
        total,
        percentUsed: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    },
    staleTime: 30000,
  });
}
