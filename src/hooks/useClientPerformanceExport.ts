import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format, parseISO, startOfDay, isAfter } from 'date-fns';
import type {
  ExportPeriod,
  ExerciseFilter,
  PerformanceExportData,
  ExerciseEntryForExport,
  ExportPR,
  PerformanceExportStats,
  ChartDataPoint,
} from '@/types/performance-export';

interface UseClientPerformanceExportOptions {
  clientId: string;
  period: ExportPeriod;
  exerciseFilter: ExerciseFilter;
  selectedExercises?: string[];
}

export function useClientPerformanceExport(options: UseClientPerformanceExportOptions | null) {
  return useQuery({
    queryKey: ['client-performance-export', options?.clientId, options?.period, options?.exerciseFilter, options?.selectedExercises],
    queryFn: async (): Promise<PerformanceExportData> => {
      if (!options?.clientId) {
        throw new Error('Client ID is required');
      }

      const { clientId, period, exerciseFilter, selectedExercises } = options;

      // Calculate date range
      const endDate = new Date();
      let startDate: Date;
      
      if (period === 'all') {
        startDate = new Date(2000, 0, 1); // Far past
      } else {
        startDate = subDays(endDate, parseInt(period));
      }

      // Fetch exercise entries
      let query = supabase
        .from('exercise_entries')
        .select('*')
        .eq('client_id', clientId)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      const { data: rawEntries, error } = await query;
      if (error) throw error;

      // Transform entries
      let entries: ExerciseEntryForExport[] = (rawEntries || []).map(e => ({
        id: e.id,
        date: e.date,
        exerciseName: e.exercise_name,
        exerciseId: e.exercise_id,
        sets: e.sets,
        reps: e.reps,
        weightKg: e.weight_kg,
        timeSeconds: e.time_seconds,
        distanceMeters: e.distance_meters,
        isBodyweight: e.is_bodyweight || false,
        isPr: e.is_pr || false,
        rpe: e.rpe,
        notes: e.notes,
      }));

      // Apply exercise filter
      if (exerciseFilter === 'prs') {
        entries = entries.filter(e => e.isPr);
      } else if (exerciseFilter === 'custom' && selectedExercises?.length) {
        entries = entries.filter(e => 
          selectedExercises.includes(e.exerciseName) || 
          (e.exerciseId && selectedExercises.includes(e.exerciseId))
        );
      }

      // Get unique exercises
      const exerciseMap = new Map<string, { id: string | null; name: string }>();
      for (const entry of entries) {
        if (!exerciseMap.has(entry.exerciseName)) {
          exerciseMap.set(entry.exerciseName, {
            id: entry.exerciseId,
            name: entry.exerciseName,
          });
        }
      }
      const uniqueExercises = Array.from(exerciseMap.values());

      // Calculate PRs (best per exercise)
      const prMap = new Map<string, ExportPR>();
      for (const entry of entries) {
        const existing = prMap.get(entry.exerciseName);
        
        // Determine metric type and value
        let metricType: 'weight' | 'time' | 'reps' | 'distance' = 'weight';
        let value = 0;
        let display = '';
        let unit = '';

        if (entry.weightKg && entry.weightKg > 0) {
          metricType = 'weight';
          value = entry.weightKg;
          display = `${entry.weightKg} kg`;
          unit = 'kg';
        } else if (entry.distanceMeters && entry.distanceMeters > 0) {
          metricType = 'distance';
          value = entry.distanceMeters;
          display = entry.distanceMeters >= 1 ? `${Math.round(entry.distanceMeters * 100)} cm` : `${Math.round(entry.distanceMeters * 100)} cm`;
          unit = 'cm';
        } else if (entry.timeSeconds && entry.timeSeconds > 0) {
          metricType = 'time';
          value = entry.timeSeconds;
          const mins = Math.floor(entry.timeSeconds / 60);
          const secs = entry.timeSeconds % 60;
          display = mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
          unit = 's';
        } else if (entry.isBodyweight && entry.reps && entry.reps > 0) {
          metricType = 'reps';
          value = entry.reps;
          display = `${entry.reps} reps`;
          unit = 'reps';
        }

        if (value > 0) {
          if (!existing || value > existing.bestValue) {
            prMap.set(entry.exerciseName, {
              exerciseName: entry.exerciseName,
              bestValue: value,
              bestDisplay: display,
              unit,
              metricType,
              achievedAt: entry.date,
            });
          }
        }
      }
      const prs = Array.from(prMap.values()).sort((a, b) => 
        new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime()
      );

      // Calculate stats
      const sessionDates = new Set(entries.map(e => e.date));
      const totalVolume = entries.reduce((sum, e) => {
        if (e.weightKg && e.sets && e.reps) {
          return sum + (e.weightKg * e.sets * e.reps);
        }
        return sum;
      }, 0);
      const totalDuration = entries.reduce((sum, e) => sum + (e.timeSeconds || 0), 0);
      
      // Top exercises by count
      const exerciseCounts = new Map<string, number>();
      for (const entry of entries) {
        exerciseCounts.set(entry.exerciseName, (exerciseCounts.get(entry.exerciseName) || 0) + 1);
      }
      const topExercises = Array.from(exerciseCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      const stats: PerformanceExportStats = {
        totalEntries: entries.length,
        totalSessions: sessionDates.size,
        totalPRs: entries.filter(e => e.isPr).length,
        totalVolume: Math.round(totalVolume),
        totalDuration,
        topExercises,
        periodStart: format(startDate, 'yyyy-MM-dd'),
        periodEnd: format(endDate, 'yyyy-MM-dd'),
      };

      // Build chart data (aggregate by date)
      const chartMap = new Map<string, { volume: number; sessions: number }>();
      for (const entry of entries) {
        const existing = chartMap.get(entry.date) || { volume: 0, sessions: 0 };
        const entryVolume = (entry.weightKg || 0) * (entry.sets || 1) * (entry.reps || 1);
        chartMap.set(entry.date, {
          volume: existing.volume + entryVolume,
          sessions: 1,
        });
      }
      const chartData: ChartDataPoint[] = Array.from(chartMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        entries,
        prs,
        stats,
        chartData,
        uniqueExercises,
      };
    },
    enabled: !!options?.clientId,
  });
}

// Fetch unique exercises for a client (for the selector)
export function useClientUniqueExercises(clientId: string | null) {
  return useQuery({
    queryKey: ['client-unique-exercises', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('exercise_entries')
        .select('exercise_id, exercise_name')
        .eq('client_id', clientId)
        .order('exercise_name');

      if (error) throw error;

      const uniqueMap = new Map<string, { id: string | null; name: string }>();
      for (const entry of data || []) {
        if (!uniqueMap.has(entry.exercise_name)) {
          uniqueMap.set(entry.exercise_name, {
            id: entry.exercise_id,
            name: entry.exercise_name,
          });
        }
      }
      return Array.from(uniqueMap.values());
    },
    enabled: !!clientId,
  });
}
