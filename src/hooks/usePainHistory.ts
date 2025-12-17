import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PainHistoryEntry {
  id: string;
  training_date: string;
  pain: number;
  pain_area: string | null;
  comment: string | null;
}

interface PainAreaStats {
  area: string;
  count: number;
  avgPain: number;
  lastOccurrence: string;
}

export function usePainHistory(clientId: string | undefined) {
  return useQuery({
    queryKey: ['pain-history', clientId],
    queryFn: async () => {
      if (!clientId) return { entries: [], stats: [] };

      const { data, error } = await supabase
        .from('training_feedback')
        .select('id, training_date, pain, pain_area, comment')
        .eq('client_id', clientId)
        .gt('pain', 1) // Only include entries with pain > 1
        .order('training_date', { ascending: false });

      if (error) throw error;

      const entries: PainHistoryEntry[] = data || [];

      // Calculate stats per area
      const areaMap = new Map<string, { count: number; totalPain: number; lastDate: string }>();

      entries.forEach((entry) => {
        if (!entry.pain_area) return;

        // Pain area can contain multiple areas separated by comma
        const areas = entry.pain_area.split(',').map(a => a.trim());

        areas.forEach((area) => {
          // Normalize area names (remove side suffix for grouping)
          const baseArea = area.replace(/_left|_right|_both/g, '');
          
          const existing = areaMap.get(baseArea);
          if (existing) {
            existing.count += 1;
            existing.totalPain += entry.pain || 0;
            if (new Date(entry.training_date) > new Date(existing.lastDate)) {
              existing.lastDate = entry.training_date;
            }
          } else {
            areaMap.set(baseArea, {
              count: 1,
              totalPain: entry.pain || 0,
              lastDate: entry.training_date,
            });
          }
        });
      });

      // Convert to array and calculate averages
      const stats: PainAreaStats[] = Array.from(areaMap.entries())
        .map(([area, data]) => ({
          area,
          count: data.count,
          avgPain: Math.round((data.totalPain / data.count) * 10) / 10,
          lastOccurrence: data.lastDate,
        }))
        .sort((a, b) => b.count - a.count);

      return { entries, stats };
    },
    enabled: !!clientId,
  });
}
