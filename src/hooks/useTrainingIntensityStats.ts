import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfYear, format, subMonths } from 'date-fns';

export interface IntensityStatsData {
  avgRPE: number;
  avgRIR: number;
  totalWithIntensity: number;
  rpeDistribution: { range: string; count: number }[];
  monthlyTrend: { month: string; avgRPE: number; avgRIR: number }[];
  highIntensityCount: number;
  lowIntensityCount: number;
}

export function useTrainingIntensityStats() {
  return useQuery({
    queryKey: ['training-intensity-stats'],
    queryFn: async (): Promise<IntensityStatsData | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const yearStart = format(startOfYear(new Date()), 'yyyy-MM-dd');

      // Fetch training sessions with RPE/RIR data
      const { data: trainings, error } = await supabase
        .from('training_sessions')
        .select('id, date, rpe, rir, status')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('date', yearStart);

      if (error) throw error;

      const sessionsWithRPE = (trainings || []).filter(t => t.rpe != null && t.rpe > 0);
      const sessionsWithRIR = (trainings || []).filter(t => t.rir != null);

      if (sessionsWithRPE.length === 0 && sessionsWithRIR.length === 0) {
        return {
          avgRPE: 0,
          avgRIR: 0,
          totalWithIntensity: 0,
          rpeDistribution: [],
          monthlyTrend: [],
          highIntensityCount: 0,
          lowIntensityCount: 0,
        };
      }

      // Calculate averages
      const avgRPE = sessionsWithRPE.length > 0
        ? sessionsWithRPE.reduce((sum, t) => sum + (t.rpe || 0), 0) / sessionsWithRPE.length
        : 0;

      const avgRIR = sessionsWithRIR.length > 0
        ? sessionsWithRIR.reduce((sum, t) => sum + (t.rir || 0), 0) / sessionsWithRIR.length
        : 0;

      // RPE distribution
      const rpeRanges = [
        { range: '1-3', min: 1, max: 3 },
        { range: '4-5', min: 4, max: 5 },
        { range: '6-7', min: 6, max: 7 },
        { range: '8-9', min: 8, max: 9 },
        { range: '10', min: 10, max: 10 },
      ];

      const rpeDistribution = rpeRanges.map(({ range, min, max }) => ({
        range,
        count: sessionsWithRPE.filter(t => (t.rpe || 0) >= min && (t.rpe || 0) <= max).length,
      }));

      // Monthly trend (last 6 months)
      const monthlyData: Record<string, { rpeSum: number; rpeCount: number; rirSum: number; rirCount: number }> = {};
      
      sessionsWithRPE.forEach(t => {
        const month = format(new Date(t.date), 'yyyy-MM');
        if (!monthlyData[month]) {
          monthlyData[month] = { rpeSum: 0, rpeCount: 0, rirSum: 0, rirCount: 0 };
        }
        monthlyData[month].rpeSum += t.rpe || 0;
        monthlyData[month].rpeCount += 1;
      });

      sessionsWithRIR.forEach(t => {
        const month = format(new Date(t.date), 'yyyy-MM');
        if (!monthlyData[month]) {
          monthlyData[month] = { rpeSum: 0, rpeCount: 0, rirSum: 0, rirCount: 0 };
        }
        monthlyData[month].rirSum += t.rir || 0;
        monthlyData[month].rirCount += 1;
      });

      const monthlyTrend = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, data]) => ({
          month: format(new Date(month + '-01'), 'MMM'),
          avgRPE: data.rpeCount > 0 ? data.rpeSum / data.rpeCount : 0,
          avgRIR: data.rirCount > 0 ? data.rirSum / data.rirCount : 0,
        }));

      // Count high/low intensity
      const highIntensityCount = sessionsWithRPE.filter(t => (t.rpe || 0) >= 8).length;
      const lowIntensityCount = sessionsWithRPE.filter(t => (t.rpe || 0) <= 5).length;

      return {
        avgRPE,
        avgRIR,
        totalWithIntensity: sessionsWithRPE.length,
        rpeDistribution,
        monthlyTrend,
        highIntensityCount,
        lowIntensityCount,
      };
    },
  });
}
