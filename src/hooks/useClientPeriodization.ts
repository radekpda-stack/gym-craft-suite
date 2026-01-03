/**
 * Client Periodization Hook
 * 
 * Determines training phase based on:
 * - Volume trends
 * - Intensity patterns
 * - Time in current phase
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subWeeks, startOfWeek, format } from 'date-fns';

export type TrainingPhase = 'accumulation' | 'intensification' | 'realization' | 'deload' | 'unknown';

export interface PeriodizationData {
  currentPhase: TrainingPhase;
  phaseLabel: string;
  phaseDescription: string;
  weeksInPhase: number;
  suggestedNextPhase: TrainingPhase;
  volumeTrend: 'increasing' | 'stable' | 'decreasing';
  intensityTrend: 'increasing' | 'stable' | 'decreasing';
  weeklyVolumes: { week: string; volume: number; avgRpe: number }[];
  recommendation: string;
}

const PHASE_CONFIG = {
  accumulation: {
    label: 'Akumulace',
    description: 'Vysoký objem, střední intenzita',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  intensification: {
    label: 'Intenzifikace',
    description: 'Střední objem, vysoká intenzita',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  realization: {
    label: 'Realizace',
    description: 'Nízký objem, maximální intenzita',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  deload: {
    label: 'Deload',
    description: 'Regenerace a zotavení',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  unknown: {
    label: 'Neznámá',
    description: 'Nedostatek dat',
    color: 'text-muted-foreground',
    bgColor: 'bg-secondary/50',
  },
};

export function useClientPeriodization(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-periodization', clientId],
    queryFn: async (): Promise<PeriodizationData> => {
      if (!clientId) throw new Error('No client ID');

      const now = new Date();
      const eightWeeksAgo = subWeeks(now, 8);

      // Fetch exercise entries for volume calculation
      const { data: entries } = await supabase
        .from('exercise_entries')
        .select('date, weight_kg, reps, sets, rpe')
        .eq('client_id', clientId)
        .gte('date', format(eightWeeksAgo, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      // Group by week and calculate metrics
      const weeklyData: { [week: string]: { volume: number; rpeSum: number; rpeCount: number } } = {};

      entries?.forEach(entry => {
        const weekStart = format(startOfWeek(new Date(entry.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
        
        if (!weeklyData[weekStart]) {
          weeklyData[weekStart] = { volume: 0, rpeSum: 0, rpeCount: 0 };
        }

        // Volume = sets * reps * weight
        const volume = (entry.sets || 1) * (entry.reps || 0) * (entry.weight_kg || 0);
        weeklyData[weekStart].volume += volume;

        if (entry.rpe) {
          weeklyData[weekStart].rpeSum += entry.rpe;
          weeklyData[weekStart].rpeCount++;
        }
      });

      // Convert to array
      const weeklyVolumes = Object.entries(weeklyData)
        .map(([week, data]) => ({
          week,
          volume: data.volume,
          avgRpe: data.rpeCount > 0 ? data.rpeSum / data.rpeCount : 0,
        }))
        .sort((a, b) => a.week.localeCompare(b.week));

      // Analyze trends (last 4 weeks)
      const recentWeeks = weeklyVolumes.slice(-4);
      
      let volumeTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
      let intensityTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';

      if (recentWeeks.length >= 3) {
        const volumes = recentWeeks.map(w => w.volume);
        const rpes = recentWeeks.map(w => w.avgRpe);

        // Volume trend
        const volumeChange = (volumes[volumes.length - 1] - volumes[0]) / (volumes[0] || 1);
        if (volumeChange > 0.1) volumeTrend = 'increasing';
        else if (volumeChange < -0.1) volumeTrend = 'decreasing';

        // RPE trend
        const rpeChange = rpes[rpes.length - 1] - rpes[0];
        if (rpeChange > 0.5) intensityTrend = 'increasing';
        else if (rpeChange < -0.5) intensityTrend = 'decreasing';
      }

      // Determine current phase based on trends
      let currentPhase: TrainingPhase = 'unknown';
      let recommendation = 'Nedostatek dat pro analýzu periodizace';

      if (recentWeeks.length >= 2) {
        const lastWeek = recentWeeks[recentWeeks.length - 1];
        const avgVolume = recentWeeks.reduce((sum, w) => sum + w.volume, 0) / recentWeeks.length;

        // Low volume week = potential deload
        if (lastWeek.volume < avgVolume * 0.6) {
          currentPhase = 'deload';
          recommendation = 'Udržujte lehčí zátěž pro plnou regeneraci';
        }
        // High volume, moderate RPE = accumulation
        else if (volumeTrend === 'increasing' && lastWeek.avgRpe < 8) {
          currentPhase = 'accumulation';
          recommendation = 'Pokračujte v navyšování objemu, sledujte únavu';
        }
        // Moderate volume, high RPE = intensification
        else if (intensityTrend === 'increasing' || lastWeek.avgRpe >= 8) {
          currentPhase = 'intensification';
          recommendation = 'Snižte objem, zaměřte se na kvalitu';
        }
        // Decreasing volume, high RPE = realization
        else if (volumeTrend === 'decreasing' && lastWeek.avgRpe >= 8.5) {
          currentPhase = 'realization';
          recommendation = 'Ideální pro testování maxim nebo závody';
        }
        else {
          currentPhase = 'accumulation';
          recommendation = 'Stabilní fáze, možnost zvýšit objem nebo intenzitu';
        }
      }

      // Suggest next phase
      const phaseOrder: TrainingPhase[] = ['accumulation', 'intensification', 'realization', 'deload'];
      const currentIndex = phaseOrder.indexOf(currentPhase);
      const suggestedNextPhase = currentIndex >= 0 
        ? phaseOrder[(currentIndex + 1) % phaseOrder.length]
        : 'accumulation';

      // Estimate weeks in current phase (simplified)
      let weeksInPhase = 0;
      if (recentWeeks.length >= 2) {
        // Count consecutive weeks with similar pattern
        weeksInPhase = Math.min(recentWeeks.length, 4);
      }

      return {
        currentPhase,
        phaseLabel: PHASE_CONFIG[currentPhase].label,
        phaseDescription: PHASE_CONFIG[currentPhase].description,
        weeksInPhase,
        suggestedNextPhase,
        volumeTrend,
        intensityTrend,
        weeklyVolumes,
        recommendation,
      };
    },
    enabled: !!clientId,
    staleTime: 30 * 60 * 1000,
  });
}

export { PHASE_CONFIG };
