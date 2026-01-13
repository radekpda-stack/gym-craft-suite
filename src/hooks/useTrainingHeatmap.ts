import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDemoMode } from '@/contexts/DemoContext';

export interface HeatmapCell {
  day: number; // 0 = Monday, 6 = Sunday
  hour: number; // 0-23
  count: number;
  totalPrice: number;
  avgDuration: number;
}

export interface TrainingHeatmapData {
  cells: HeatmapCell[];
  maxCount: number;
  totalTrainings: number;
  busiestSlot: { day: number; hour: number; count: number } | null;
  quietestSlot: { day: number; hour: number; count: number } | null;
}

const DAYS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

// Demo data for heatmap
const generateDemoHeatmap = (): TrainingHeatmapData => {
  const cells: HeatmapCell[] = [];
  let maxCount = 0;
  let totalTrainings = 0;
  let busiestSlot: HeatmapCell | null = null;
  let quietestSlot: HeatmapCell | null = null;

  for (let day = 0; day < 7; day++) {
    for (let hour = 6; hour <= 21; hour++) {
      // Simulate realistic patterns
      let count = 0;
      if (hour >= 7 && hour <= 10) count = Math.floor(Math.random() * 5) + 2;
      else if (hour >= 16 && hour <= 19) count = Math.floor(Math.random() * 8) + 4;
      else if (hour >= 11 && hour <= 15) count = Math.floor(Math.random() * 3);
      else count = Math.floor(Math.random() * 2);

      // Weekend less busy
      if (day >= 5) count = Math.floor(count * 0.4);

      const cell: HeatmapCell = {
        day,
        hour,
        count,
        totalPrice: count * (800 + Math.random() * 400),
        avgDuration: 55 + Math.random() * 15,
      };
      cells.push(cell);
      totalTrainings += count;

      if (count > maxCount) {
        maxCount = count;
        busiestSlot = cell;
      }
      if (quietestSlot === null || count < quietestSlot.count) {
        quietestSlot = cell;
      }
    }
  }

  return {
    cells,
    maxCount,
    totalTrainings,
    busiestSlot: busiestSlot ? { day: busiestSlot.day, hour: busiestSlot.hour, count: busiestSlot.count } : null,
    quietestSlot: quietestSlot ? { day: quietestSlot.day, hour: quietestSlot.hour, count: quietestSlot.count } : null,
  };
};

export function useTrainingHeatmap(period: 'month' | '3months' | 'year' | 'all' = 'year') {
  const { isDemo } = useDemoMode();

  return useQuery({
    queryKey: ['training-heatmap', period, isDemo],
    staleTime: 1000 * 60 * 10,
    queryFn: async (): Promise<TrainingHeatmapData> => {
      if (isDemo) {
        return generateDemoHeatmap();
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Calculate date range
      const now = new Date();
      let startDate: Date;
      switch (period) {
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          break;
        case '3months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          break;
        case 'year':
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          break;
        case 'all':
        default:
          startDate = new Date(2020, 0, 1);
      }

      const { data: sessions, error } = await supabase
        .from('training_sessions')
        .select('date, duration, final_price')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('date', startDate.toISOString());

      if (error) throw error;

      // Aggregate by day x hour
      const grid: Map<string, { count: number; totalPrice: number; totalDuration: number }> = new Map();

      for (const session of sessions || []) {
        const date = new Date(session.date);
        // Convert to local day (0 = Monday)
        let day = date.getDay() - 1;
        if (day < 0) day = 6; // Sunday becomes 6
        const hour = date.getHours();
        const key = `${day}-${hour}`;

        const existing = grid.get(key) || { count: 0, totalPrice: 0, totalDuration: 0 };
        existing.count++;
        existing.totalPrice += session.final_price || 0;
        existing.totalDuration += session.duration || 60;
        grid.set(key, existing);
      }

      // Convert to array
      const cells: HeatmapCell[] = [];
      let maxCount = 0;
      let totalTrainings = 0;
      let busiestSlot: HeatmapCell | null = null;
      let quietestSlot: HeatmapCell | null = null;

      for (let day = 0; day < 7; day++) {
        for (let hour = 6; hour <= 21; hour++) {
          const key = `${day}-${hour}`;
          const data = grid.get(key) || { count: 0, totalPrice: 0, totalDuration: 0 };
          
          const cell: HeatmapCell = {
            day,
            hour,
            count: data.count,
            totalPrice: data.totalPrice,
            avgDuration: data.count > 0 ? data.totalDuration / data.count : 0,
          };
          cells.push(cell);
          totalTrainings += data.count;

          if (data.count > maxCount) {
            maxCount = data.count;
            busiestSlot = cell;
          }
          if (data.count > 0 && (quietestSlot === null || data.count < quietestSlot.count)) {
            quietestSlot = cell;
          }
        }
      }

      return {
        cells,
        maxCount,
        totalTrainings,
        busiestSlot: busiestSlot ? { day: busiestSlot.day, hour: busiestSlot.hour, count: busiestSlot.count } : null,
        quietestSlot: quietestSlot ? { day: quietestSlot.day, hour: quietestSlot.hour, count: quietestSlot.count } : null,
      };
    },
  });
}

export function getDayName(day: number): string {
  return DAYS[day] || '';
}

export function formatHour(hour: number): string {
  return `${hour}:00`;
}
