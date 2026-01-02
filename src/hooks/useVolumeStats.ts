import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, subWeeks, format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';

interface WeeklyVolume {
  week: string;
  weekLabel: string;
  volume: number;
}

interface VolumeStats {
  weeklyData: WeeklyVolume[];
  totalVolume: number;
  avgWeeklyVolume: number;
  trend: number; // percentage change vs previous period
}

export function useVolumeStats(weeks: number = 8) {
  return useQuery({
    queryKey: ['volume-stats', weeks],
    queryFn: async (): Promise<VolumeStats> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const startDate = subWeeks(new Date(), weeks);
      
      const { data: entries, error } = await supabase
        .from('exercise_entries')
        .select('date, sets, reps, weight_kg')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .not('weight_kg', 'is', null)
        .not('sets', 'is', null)
        .not('reps', 'is', null);

      if (error) throw error;

      // Group by week and calculate volume
      const weeklyMap = new Map<string, number>();
      
      entries?.forEach(entry => {
        if (entry.weight_kg && entry.sets && entry.reps) {
          const entryDate = parseISO(entry.date);
          const weekStart = startOfWeek(entryDate, { weekStartsOn: 1 });
          const weekKey = format(weekStart, 'yyyy-MM-dd');
          
          const volume = entry.sets * entry.reps * entry.weight_kg;
          weeklyMap.set(weekKey, (weeklyMap.get(weekKey) || 0) + volume);
        }
      });

      // Generate all weeks in range
      const weeklyData: WeeklyVolume[] = [];
      for (let i = weeks - 1; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        const weekLabel = format(weekStart, 'd. MMM', { locale: cs });
        
        weeklyData.push({
          week: weekKey,
          weekLabel,
          volume: Math.round(weeklyMap.get(weekKey) || 0),
        });
      }

      const totalVolume = weeklyData.reduce((sum, w) => sum + w.volume, 0);
      const avgWeeklyVolume = totalVolume / weeks;

      // Calculate trend (last 4 weeks vs previous 4 weeks)
      const midpoint = Math.floor(weeks / 2);
      const recentVolume = weeklyData.slice(midpoint).reduce((sum, w) => sum + w.volume, 0);
      const previousVolume = weeklyData.slice(0, midpoint).reduce((sum, w) => sum + w.volume, 0);
      
      const trend = previousVolume > 0 
        ? ((recentVolume - previousVolume) / previousVolume) * 100 
        : 0;

      return {
        weeklyData,
        totalVolume: Math.round(totalVolume),
        avgWeeklyVolume: Math.round(avgWeeklyVolume),
        trend: Math.round(trend),
      };
    },
  });
}
