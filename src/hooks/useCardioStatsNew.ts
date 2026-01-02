import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subMonths } from 'date-fns';

interface CardioStatsData {
  totalDistance: number; // in km
  totalTime: number; // in seconds
  avgHeartRate: number | null;
  totalCalories: number;
  sessionCount: number;
}

export function useCardioStatsNew(months: number = 3) {
  return useQuery({
    queryKey: ['cardio-stats-new', months],
    queryFn: async (): Promise<CardioStatsData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const startDate = subMonths(new Date(), months);

      // Fetch from cardio_entries table
      const { data: cardioEntries, error: cardioError } = await supabase
        .from('cardio_entries')
        .select('duration_seconds, distance_meters, avg_heart_rate')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0]);

      if (cardioError) throw cardioError;

      // Fetch from exercise_entries with cardio data
      const { data: exerciseEntries, error: exerciseError } = await supabase
        .from('exercise_entries')
        .select('time_seconds, distance_meters, avg_heart_rate, calories_kcal')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .or('distance_meters.not.is.null,avg_heart_rate.not.is.null,time_seconds.gt.0');

      if (exerciseError) throw exerciseError;

      // Aggregate cardio_entries
      let totalDistance = 0;
      let totalTime = 0;
      let heartRateSum = 0;
      let heartRateCount = 0;
      let totalCalories = 0;
      let sessionCount = 0;

      cardioEntries?.forEach(entry => {
        if (entry.distance_meters) {
          totalDistance += entry.distance_meters;
        }
        if (entry.duration_seconds) {
          totalTime += entry.duration_seconds;
        }
        if (entry.avg_heart_rate) {
          heartRateSum += entry.avg_heart_rate;
          heartRateCount++;
        }
        sessionCount++;
      });

      // Aggregate exercise_entries with cardio data
      exerciseEntries?.forEach(entry => {
        if (entry.distance_meters) {
          totalDistance += entry.distance_meters;
        }
        if (entry.time_seconds && entry.time_seconds > 0) {
          totalTime += entry.time_seconds;
        }
        if (entry.avg_heart_rate) {
          heartRateSum += entry.avg_heart_rate;
          heartRateCount++;
        }
        if (entry.calories_kcal) {
          totalCalories += entry.calories_kcal;
        }
        sessionCount++;
      });

      return {
        totalDistance: totalDistance / 1000, // convert to km
        totalTime,
        avgHeartRate: heartRateCount > 0 ? Math.round(heartRateSum / heartRateCount) : null,
        totalCalories: Math.round(totalCalories),
        sessionCount,
      };
    },
  });
}
