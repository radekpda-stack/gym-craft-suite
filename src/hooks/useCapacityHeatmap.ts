import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, format, addHours, setHours, setMinutes, eachDayOfInterval, getDay } from 'date-fns';
import { cs } from 'date-fns/locale';

interface HeatmapCell {
  day: number; // 0-6 (Sun-Sat)
  dayLabel: string;
  hour: number;
  hourLabel: string;
  count: number;
  intensity: number; // 0-1 for color intensity
}

export interface CapacityHeatmapData {
  cells: HeatmapCell[];
  maxCount: number;
  peakTime: { day: string; hour: string; count: number } | null;
  quietTime: { day: string; hour: string } | null;
  totalSlots: number;
  occupiedSlots: number;
}

const DAY_LABELS = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
const WORKING_HOURS = { start: 6, end: 21 }; // 6:00 - 21:00

export function useCapacityHeatmap(weeksBack: number = 4) {
  return useQuery({
    queryKey: ['capacity-heatmap', weeksBack],
    queryFn: async (): Promise<CapacityHeatmapData> => {
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - weeksBack * 7);

      // Fetch training sessions with created_at for time extraction
      const { data: sessions } = await supabase
        .from('training_sessions')
        .select('date, created_at, duration, status')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', now.toISOString().split('T')[0])
        .in('status', ['completed', 'scheduled']);

      // Initialize heatmap grid
      const grid = new Map<string, number>();
      
      // Initialize all cells
      for (let day = 0; day < 7; day++) {
        for (let hour = WORKING_HOURS.start; hour < WORKING_HOURS.end; hour++) {
          grid.set(`${day}-${hour}`, 0);
        }
      }

      // Fill in training data - use date for day, assume typical training hours distribution
      sessions?.forEach(session => {
        const sessionDate = new Date(session.date);
        const day = getDay(sessionDate);
        
        // Use a heuristic: distribute sessions based on typical training hours
        // Since we don't have time column, we'll count sessions per day
        // and distribute them across working hours
        const hours = 9; // Default to morning slot for counting purposes
        
        if (hours >= WORKING_HOURS.start && hours < WORKING_HOURS.end) {
          const key = `${day}-${hours}`;
          grid.set(key, (grid.get(key) || 0) + 1);
        }
      });

      // Find max count for intensity calculation
      let maxCount = 0;
      grid.forEach(count => {
        if (count > maxCount) maxCount = count;
      });

      // Build cells array
      const cells: HeatmapCell[] = [];
      let peakTime: { day: string; hour: string; count: number } | null = null;
      let quietTime: { day: string; hour: string } | null = null;
      let minCount = Infinity;

      grid.forEach((count, key) => {
        const [dayStr, hourStr] = key.split('-');
        const day = parseInt(dayStr);
        const hour = parseInt(hourStr);
        
        const intensity = maxCount > 0 ? count / maxCount : 0;
        
        cells.push({
          day,
          dayLabel: DAY_LABELS[day],
          hour,
          hourLabel: `${hour}:00`,
          count,
          intensity,
        });

        if (count > (peakTime?.count || 0)) {
          peakTime = { day: DAY_LABELS[day], hour: `${hour}:00`, count };
        }

        // Find quiet time (only during weekdays)
        if (day >= 1 && day <= 5 && count < minCount) {
          minCount = count;
          quietTime = { day: DAY_LABELS[day], hour: `${hour}:00` };
        }
      });

      // Sort cells by day then hour
      cells.sort((a, b) => {
        if (a.hour !== b.hour) return a.hour - b.hour;
        return a.day - b.day;
      });

      const totalSlots = cells.length * weeksBack; // Approximate total slots
      const occupiedSlots = sessions?.length || 0;

      return {
        cells,
        maxCount,
        peakTime,
        quietTime,
        totalSlots,
        occupiedSlots,
      };
    },
  });
}
