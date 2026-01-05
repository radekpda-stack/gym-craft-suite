import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { detectExerciseMetricCategory, ExerciseMetricCategory } from '@/lib/exerciseMetrics';

export interface PaceDataPoint {
  date: string;
  exerciseId: string;
  exerciseName: string;
  category: ExerciseMetricCategory;
  timeSeconds: number;
  distanceMeters: number;
  paceNormalized: number; // Pace per 500m (rower/skierg) or per 1km (running)
  paceDisplay: string;
  isPR: boolean;
}

export interface PaceTrendData {
  rower: PaceDataPoint[];
  skierg: PaceDataPoint[];
  treadmill: PaceDataPoint[];
  trends: {
    rower: 'improving' | 'declining' | 'stable' | null;
    skierg: 'improving' | 'declining' | 'stable' | null;
    treadmill: 'improving' | 'declining' | 'stable' | null;
  };
  bestPaces: {
    rower: PaceDataPoint | null;
    skierg: PaceDataPoint | null;
    treadmill: PaceDataPoint | null;
  };
}

function formatPace(seconds: number, unit: '/500m' | '/km'): string {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return `${mins}:${parseFloat(secs).toFixed(1).padStart(4, '0')} ${unit}`;
}

function calculateTrend(dataPoints: PaceDataPoint[]): 'improving' | 'declining' | 'stable' | null {
  if (dataPoints.length < 3) return null;
  
  // Sort by date ascending
  const sorted = [...dataPoints].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Compare first third vs last third
  const third = Math.floor(sorted.length / 3);
  if (third === 0) return null;
  
  const firstThird = sorted.slice(0, third);
  const lastThird = sorted.slice(-third);
  
  const avgFirst = firstThird.reduce((sum, p) => sum + p.paceNormalized, 0) / firstThird.length;
  const avgLast = lastThird.reduce((sum, p) => sum + p.paceNormalized, 0) / lastThird.length;
  
  // For pace, lower is better (faster)
  const changePercent = ((avgFirst - avgLast) / avgFirst) * 100;
  
  if (changePercent > 3) return 'improving'; // Pace decreased by more than 3%
  if (changePercent < -3) return 'declining'; // Pace increased by more than 3%
  return 'stable';
}

export function useClientPaceTrend(clientId?: string) {
  return useQuery({
    queryKey: ['client-pace-trend', clientId],
    queryFn: async () => {
      if (!clientId) return null;

      // Fetch all time-based exercise entries for this client
      const { data: entries, error } = await supabase
        .from('exercise_entries')
        .select(`
          id,
          exercise_id,
          date,
          time_seconds,
          distance_meters,
          pace_sec_per_500m,
          pace_sec_per_km,
          is_pr,
          exercises(id, name, name_cs, category, is_time_based)
        `)
        .eq('client_id', clientId)
        .not('time_seconds', 'is', null)
        .gt('time_seconds', 0)
        .order('date', { ascending: true });

      if (error) throw error;

      const result: PaceTrendData = {
        rower: [],
        skierg: [],
        treadmill: [],
        trends: {
          rower: null,
          skierg: null,
          treadmill: null,
        },
        bestPaces: {
          rower: null,
          skierg: null,
          treadmill: null,
        },
      };

      (entries || []).forEach(entry => {
        const exercise = entry.exercises as any;
        if (!exercise) return;

        const exerciseName = exercise.name_cs || exercise.name || '';
        const category = detectExerciseMetricCategory(exerciseName, exercise.category);
        
        // Only process cardio categories
        if (!['rower', 'skierg', 'treadmill'].includes(category)) return;

        const timeSeconds = entry.time_seconds || 0;
        // Default distance based on category if not specified
        const distanceMeters = entry.distance_meters || 
          (category === 'treadmill' ? 1000 : 500);

        let paceNormalized: number;
        let paceDisplay: string;

        if (category === 'treadmill') {
          // Pace per 1km for running
          if (entry.pace_sec_per_km && entry.pace_sec_per_km > 0) {
            paceNormalized = entry.pace_sec_per_km;
          } else {
            paceNormalized = (timeSeconds / distanceMeters) * 1000;
          }
          paceDisplay = formatPace(paceNormalized, '/km');
        } else {
          // Pace per 500m for rower/skierg
          if (entry.pace_sec_per_500m && entry.pace_sec_per_500m > 0) {
            paceNormalized = entry.pace_sec_per_500m;
          } else {
            paceNormalized = (timeSeconds / distanceMeters) * 500;
          }
          paceDisplay = formatPace(paceNormalized, '/500m');
        }

        const dataPoint: PaceDataPoint = {
          date: entry.date,
          exerciseId: entry.exercise_id,
          exerciseName,
          category,
          timeSeconds,
          distanceMeters,
          paceNormalized,
          paceDisplay,
          isPR: entry.is_pr || false,
        };

        if (category === 'rower') {
          result.rower.push(dataPoint);
        } else if (category === 'skierg') {
          result.skierg.push(dataPoint);
        } else if (category === 'treadmill') {
          result.treadmill.push(dataPoint);
        }
      });

      // Calculate trends
      result.trends.rower = calculateTrend(result.rower);
      result.trends.skierg = calculateTrend(result.skierg);
      result.trends.treadmill = calculateTrend(result.treadmill);

      // Find best paces (lowest = fastest)
      if (result.rower.length > 0) {
        result.bestPaces.rower = result.rower.reduce((best, curr) => 
          curr.paceNormalized < best.paceNormalized ? curr : best
        );
      }
      if (result.skierg.length > 0) {
        result.bestPaces.skierg = result.skierg.reduce((best, curr) => 
          curr.paceNormalized < best.paceNormalized ? curr : best
        );
      }
      if (result.treadmill.length > 0) {
        result.bestPaces.treadmill = result.treadmill.reduce((best, curr) => 
          curr.paceNormalized < best.paceNormalized ? curr : best
        );
      }

      return result;
    },
    enabled: !!clientId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
