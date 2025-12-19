import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PainHistoryEntry {
  id: string;
  training_date: string;
  pain: number;
  pain_area: string | null;
  pain_area_intensities: Record<string, number> | null;
  comment: string | null;
}

interface PainAreaStats {
  area: string;
  count: number;
  avgPain: number;
  lastOccurrence: string;
  firstOccurrence: string;
  countLast30Days: number;
  isChronic: boolean;
}

interface PainIntensityTrendEntry {
  date: string;
  training_date: string;
  areas: Record<string, number>;
}

export function usePainHistory(clientId: string | undefined) {
  return useQuery({
    queryKey: ['pain-history', clientId],
    queryFn: async () => {
      if (!clientId) return { entries: [], stats: [], intensityTrend: [] };

      const { data, error } = await supabase
        .from('training_feedback')
        .select('id, training_date, pain, pain_area, pain_area_intensities, comment')
        .eq('client_id', clientId)
        .gt('pain', 1) // Only include entries with pain > 1
        .order('training_date', { ascending: false });

      if (error) throw error;

      const entries: PainHistoryEntry[] = (data || []).map(d => ({
        ...d,
        pain_area_intensities: d.pain_area_intensities as Record<string, number> | null
      }));

      // Calculate stats per area with chronicity tracking
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const areaMap = new Map<string, { 
        count: number; 
        totalPain: number; 
        lastDate: string; 
        firstDate: string;
        countLast30Days: number;
      }>();

      entries.forEach((entry) => {
        const entryDate = new Date(entry.training_date);
        const isWithin30Days = entryDate >= thirtyDaysAgo;

        // Use pain_area_intensities if available, otherwise fall back to pain_area
        if (entry.pain_area_intensities && Object.keys(entry.pain_area_intensities).length > 0) {
          Object.entries(entry.pain_area_intensities).forEach(([area, intensity]) => {
            const baseArea = area.replace(/_left|_right|_both/g, '');
            const existing = areaMap.get(baseArea);
            if (existing) {
              existing.count += 1;
              existing.totalPain += intensity;
              if (isWithin30Days) existing.countLast30Days += 1;
              if (new Date(entry.training_date) > new Date(existing.lastDate)) {
                existing.lastDate = entry.training_date;
              }
              if (new Date(entry.training_date) < new Date(existing.firstDate)) {
                existing.firstDate = entry.training_date;
              }
            } else {
              areaMap.set(baseArea, {
                count: 1,
                totalPain: intensity,
                lastDate: entry.training_date,
                firstDate: entry.training_date,
                countLast30Days: isWithin30Days ? 1 : 0,
              });
            }
          });
        } else if (entry.pain_area) {
          const areas = entry.pain_area.split(',').map(a => a.trim());
          areas.forEach((area) => {
            const baseArea = area.replace(/_left|_right|_both/g, '');
            const existing = areaMap.get(baseArea);
            if (existing) {
              existing.count += 1;
              existing.totalPain += entry.pain || 0;
              if (isWithin30Days) existing.countLast30Days += 1;
              if (new Date(entry.training_date) > new Date(existing.lastDate)) {
                existing.lastDate = entry.training_date;
              }
              if (new Date(entry.training_date) < new Date(existing.firstDate)) {
                existing.firstDate = entry.training_date;
              }
            } else {
              areaMap.set(baseArea, {
                count: 1,
                totalPain: entry.pain || 0,
                lastDate: entry.training_date,
                firstDate: entry.training_date,
                countLast30Days: isWithin30Days ? 1 : 0,
              });
            }
          });
        }
      });

      // Convert to array and calculate averages with chronicity
      const stats: PainAreaStats[] = Array.from(areaMap.entries())
        .map(([area, data]) => ({
          area,
          count: data.count,
          avgPain: Math.round((data.totalPain / data.count) * 10) / 10,
          lastOccurrence: data.lastDate,
          firstOccurrence: data.firstDate,
          countLast30Days: data.countLast30Days,
          isChronic: data.countLast30Days > 3,
        }))
        .sort((a, b) => b.count - a.count);

      // Build intensity trend data for multi-line chart
      const entriesWithIntensities = entries.filter(
        e => e.pain_area_intensities && Object.keys(e.pain_area_intensities).length > 0
      );
      
      const intensityTrend: PainIntensityTrendEntry[] = entriesWithIntensities
        .slice(0, 15) // Last 15 entries
        .reverse() // Oldest first for chart
        .map(e => ({
          date: e.training_date,
          training_date: e.training_date,
          areas: e.pain_area_intensities || {},
        }));

      return { entries, stats, intensityTrend };
    },
    enabled: !!clientId,
  });
}
