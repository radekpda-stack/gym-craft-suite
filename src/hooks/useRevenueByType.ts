import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import type { StatsPeriodRange } from '@/components/statistics/StatsPeriodSelector';

export interface RevenueByTypeItem {
  type: string;
  typeLabel: string;
  revenue: number;
  trainings: number;
  avgPerTraining: number;
  totalMinutes: number;
  hourlyRate: number;
  percentage: number;
}

export interface RevenueByTypeData {
  items: RevenueByTypeItem[];
  totalRevenue: number;
  topType: RevenueByTypeItem | null;
  insight: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  strength: 'Silové',
  cardio: 'Kardio',
  hiit: 'HIIT',
  conditioning: 'Kondiční',
  functional: 'Funkční',
  mobility: 'Mobilita',
  running: 'Běh',
  other: 'Ostatní',
};

export function useRevenueByType(periodRange: StatsPeriodRange | undefined) {
  return useQuery({
    queryKey: ['revenue-by-type', periodRange?.start?.toISOString(), periodRange?.end?.toISOString()],
    queryFn: async (): Promise<RevenueByTypeData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const startStr = periodRange?.start ? format(periodRange.start, 'yyyy-MM-dd') : undefined;
      const endStr = periodRange?.end ? format(periodRange.end, 'yyyy-MM-dd') : undefined;

      // Fetch trainings with their prices
      let query = supabase
        .from('training_sessions')
        .select('id, training_type, final_price, duration')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      if (startStr) query = query.gte('date', startStr);
      if (endStr) query = query.lte('date', endStr);

      const { data: trainings } = await query;

      if (!trainings || trainings.length === 0) {
        return { items: [], totalRevenue: 0, topType: null, insight: null };
      }

      // Aggregate by type
      const byType: Record<string, { revenue: number; count: number; minutes: number }> = {};
      
      trainings.forEach(t => {
        const type = t.training_type || 'other';
        if (!byType[type]) {
          byType[type] = { revenue: 0, count: 0, minutes: 0 };
        }
        byType[type].revenue += t.final_price || 0;
        byType[type].count += 1;
        byType[type].minutes += t.duration || 60;
      });

      const totalRevenue = Object.values(byType).reduce((sum, v) => sum + v.revenue, 0);

      const items: RevenueByTypeItem[] = Object.entries(byType)
        .map(([type, data]) => {
          const hours = data.minutes / 60;
          return {
            type,
            typeLabel: TYPE_LABELS[type] || type,
            revenue: data.revenue,
            trainings: data.count,
            avgPerTraining: data.count > 0 ? Math.round(data.revenue / data.count) : 0,
            totalMinutes: data.minutes,
            hourlyRate: hours > 0 ? Math.round(data.revenue / hours) : 0,
            percentage: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0,
          };
        })
        .sort((a, b) => b.revenue - a.revenue);

      const topType = items[0] || null;

      // Generate insight
      let insight: string | null = null;
      if (topType && items.length > 1) {
        const secondType = items[1];
        if (topType.hourlyRate > secondType.hourlyRate * 1.2) {
          insight = `${topType.typeLabel} tréninky mají nejvyšší hodinovou sazbu (${topType.hourlyRate} Kč/h)`;
        } else {
          insight = `${topType.typeLabel} generuje ${topType.percentage}% příjmů`;
        }
      }

      return { items, totalRevenue, topType, insight };
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!periodRange,
  });
}
