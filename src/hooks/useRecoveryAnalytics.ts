/**
 * Recovery Analytics Hook
 * Analyzes sleep data, recovery patterns, and generates readiness scores
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { safeAverage } from '@/lib/feedbackCalculations';
import { subDays } from 'date-fns';

// ============================================================================
// Types
// ============================================================================

export interface SleepData {
  sleep_after: 'poor' | 'average' | 'good' | null;
  sleep_hours: number | null;
  training_date: string;
}

export interface RecoveryScore {
  /** Overall readiness score 1-10 */
  readinessScore: number | null;
  /** Individual component scores */
  components: {
    sleep: number | null;      // Based on sleep_after + sleep_hours
    soreness: number | null;   // Inverted soreness (10 - soreness)
    energy: number | null;     // Direct energy rating
    bodyFeel: number | null;   // Direct body feel
  };
  /** Trend compared to previous period */
  trend: 'improving' | 'stable' | 'declining' | 'unknown';
  /** Human-readable status */
  status: 'ready' | 'moderate' | 'fatigued' | 'unknown';
  statusLabel: string;
}

export interface SleepImpact {
  /** Correlation between sleep quality and next-day energy */
  sleepEnergyCorrelation: 'positive' | 'negative' | 'neutral' | 'insufficient_data';
  /** Average energy after good sleep */
  avgEnergyAfterGoodSleep: number | null;
  /** Average energy after poor sleep */
  avgEnergyAfterPoorSleep: number | null;
  /** Recommended sleep hours based on best performance */
  optimalSleepHours: number | null;
  /** Summary insight */
  insight: string | null;
}

export interface PainAreaHistory {
  area: string;
  occurrences: Array<{
    date: string;
    intensity: number;
    isNew: boolean;
  }>;
  totalCount: number;
  averageIntensity: number | null;
  isRecurring: boolean; // 3+ occurrences in 30 days
  lastOccurrence: string | null;
  trend: 'worsening' | 'stable' | 'improving' | 'unknown';
}

export interface EnjoymentTrend {
  currentAvg: number | null;
  previousAvg: number | null;
  trend: 'up' | 'stable' | 'declining' | 'unknown';
  isWarning: boolean;
  warningMessage: string | null;
  consecutiveLowCount: number;
}

// ============================================================================
// Sleep Quality Scoring
// ============================================================================

function scoreSleepQuality(sleepAfter: string | null, sleepHours: number | null): number | null {
  if (!sleepAfter && sleepHours == null) return null;
  
  let score = 5; // Default neutral
  
  // Sleep quality factor (40% weight)
  if (sleepAfter === 'good') score += 2;
  else if (sleepAfter === 'poor') score -= 2;
  
  // Sleep hours factor (60% weight) - optimal is 7-9 hours
  if (sleepHours != null) {
    if (sleepHours >= 7 && sleepHours <= 9) {
      score += 3;
    } else if (sleepHours >= 6 && sleepHours < 7) {
      score += 1;
    } else if (sleepHours >= 9 && sleepHours <= 10) {
      score += 2;
    } else if (sleepHours < 6) {
      score -= 2;
    } else if (sleepHours > 10) {
      score += 0; // Neutral for oversleep
    }
  }
  
  return Math.max(1, Math.min(10, score));
}

// ============================================================================
// Recovery Score Calculator
// ============================================================================

export function calculateRecoveryScore(feedback: {
  sleep_after?: string | null;
  sleep_hours?: number | null;
  soreness?: number | null;
  energy_rating?: number | null;
  body_feel?: number | null;
}): RecoveryScore {
  const sleepScore = scoreSleepQuality(feedback.sleep_after ?? null, feedback.sleep_hours ?? null);
  const sorenessScore = feedback.soreness != null ? 10 - feedback.soreness : null;
  const energyScore = feedback.energy_rating ?? null;
  const bodyFeelScore = feedback.body_feel ?? null;
  
  const scores = [sleepScore, sorenessScore, energyScore, bodyFeelScore].filter(
    (s): s is number => s != null
  );
  
  const readinessScore = scores.length > 0 
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10
    : null;
  
  // Determine status
  let status: RecoveryScore['status'] = 'unknown';
  let statusLabel = 'Nedostatek dat';
  
  if (readinessScore != null) {
    if (readinessScore >= 7) {
      status = 'ready';
      statusLabel = 'Připraven k tréninku';
    } else if (readinessScore >= 5) {
      status = 'moderate';
      statusLabel = 'Mírná únava';
    } else {
      status = 'fatigued';
      statusLabel = 'Doporučena regenerace';
    }
  }
  
  return {
    readinessScore,
    components: {
      sleep: sleepScore,
      soreness: sorenessScore,
      energy: energyScore,
      bodyFeel: bodyFeelScore,
    },
    trend: 'unknown', // Will be calculated in hook with historical data
    status,
    statusLabel,
  };
}

// ============================================================================
// Main Hook: useRecoveryAnalytics
// ============================================================================

export function useRecoveryAnalytics(clientId: string | undefined, options?: { days?: number }) {
  const days = options?.days ?? 30;
  
  return useQuery({
    queryKey: ['recovery-analytics', clientId, days],
    queryFn: async () => {
      if (!clientId) return null;
      
      const startDate = subDays(new Date(), days);
      
      const { data: feedbacks, error } = await supabase
        .from('training_feedback')
        .select(`
          id,
          training_date,
          sleep_after,
          sleep_hours,
          soreness,
          energy_rating,
          body_feel,
          pain,
          pain_area,
          pain_area_intensities,
          fun,
          difficulty
        `)
        .eq('client_id', clientId)
        .gte('training_date', startDate.toISOString())
        .order('training_date', { ascending: false });
      
      if (error) throw error;
      if (!feedbacks || feedbacks.length === 0) return null;
      
      // =====================================================================
      // Calculate Recovery Scores with trend
      // =====================================================================
      const midpoint = Math.floor(feedbacks.length / 2);
      const recentFeedbacks = feedbacks.slice(0, Math.max(3, midpoint));
      const olderFeedbacks = feedbacks.slice(midpoint);
      
      const recentScores = recentFeedbacks.map(f => calculateRecoveryScore(f));
      const olderScores = olderFeedbacks.map(f => calculateRecoveryScore(f));
      
      const recentAvg = safeAverage(recentScores.map(s => s.readinessScore));
      const olderAvg = safeAverage(olderScores.map(s => s.readinessScore));
      
      let recoveryTrend: RecoveryScore['trend'] = 'unknown';
      if (recentAvg != null && olderAvg != null) {
        if (recentAvg > olderAvg + 0.5) recoveryTrend = 'improving';
        else if (recentAvg < olderAvg - 0.5) recoveryTrend = 'declining';
        else recoveryTrend = 'stable';
      }
      
      const latestRecovery = recentScores[0] || calculateRecoveryScore({});
      latestRecovery.trend = recoveryTrend;
      
      // =====================================================================
      // Sleep Impact Analysis
      // =====================================================================
      const goodSleepFeedbacks = feedbacks.filter(f => f.sleep_after === 'good');
      const poorSleepFeedbacks = feedbacks.filter(f => f.sleep_after === 'poor');
      
      const avgEnergyAfterGoodSleep = safeAverage(goodSleepFeedbacks.map(f => f.energy_rating));
      const avgEnergyAfterPoorSleep = safeAverage(poorSleepFeedbacks.map(f => f.energy_rating));
      
      let sleepEnergyCorrelation: SleepImpact['sleepEnergyCorrelation'] = 'insufficient_data';
      if (goodSleepFeedbacks.length >= 2 && poorSleepFeedbacks.length >= 2) {
        if (avgEnergyAfterGoodSleep != null && avgEnergyAfterPoorSleep != null) {
          const diff = avgEnergyAfterGoodSleep - avgEnergyAfterPoorSleep;
          if (diff > 1) sleepEnergyCorrelation = 'positive';
          else if (diff < -1) sleepEnergyCorrelation = 'negative';
          else sleepEnergyCorrelation = 'neutral';
        }
      }
      
      // Find optimal sleep hours (where energy is highest)
      const sleepEnergyPairs = feedbacks
        .filter(f => f.sleep_hours != null && f.energy_rating != null)
        .map(f => ({ hours: f.sleep_hours!, energy: f.energy_rating! }));
      
      let optimalSleepHours: number | null = null;
      if (sleepEnergyPairs.length >= 5) {
        // Group by hour ranges and find best
        const hourRanges: Record<string, number[]> = {};
        sleepEnergyPairs.forEach(({ hours, energy }) => {
          const range = hours < 6 ? '<6' : hours < 7 ? '6-7' : hours < 8 ? '7-8' : hours < 9 ? '8-9' : '9+';
          if (!hourRanges[range]) hourRanges[range] = [];
          hourRanges[range].push(energy);
        });
        
        let bestRange = '';
        let bestAvg = 0;
        Object.entries(hourRanges).forEach(([range, energies]) => {
          const avg = safeAverage(energies);
          if (avg != null && avg > bestAvg) {
            bestAvg = avg;
            bestRange = range;
          }
        });
        
        // Convert range to recommended hours
        if (bestRange === '7-8') optimalSleepHours = 7.5;
        else if (bestRange === '8-9') optimalSleepHours = 8.5;
        else if (bestRange === '6-7') optimalSleepHours = 6.5;
        else if (bestRange === '9+') optimalSleepHours = 9;
      }
      
      // Generate sleep insight
      let sleepInsight: string | null = null;
      if (sleepEnergyCorrelation === 'positive' && avgEnergyAfterGoodSleep && avgEnergyAfterPoorSleep) {
        const diff = Math.round((avgEnergyAfterGoodSleep - avgEnergyAfterPoorSleep) * 10) / 10;
        sleepInsight = `Kvalitní spánek zvyšuje energii o ${diff} bodů`;
      } else if (optimalSleepHours) {
        sleepInsight = `Optimální délka spánku: ${optimalSleepHours} hodin`;
      }
      
      const sleepImpact: SleepImpact = {
        sleepEnergyCorrelation,
        avgEnergyAfterGoodSleep,
        avgEnergyAfterPoorSleep,
        optimalSleepHours,
        insight: sleepInsight,
      };
      
      // =====================================================================
      // Pain Area History
      // =====================================================================
      const painAreaMap = new Map<string, PainAreaHistory['occurrences']>();
      
      feedbacks.forEach(f => {
        if (f.pain_area_intensities && typeof f.pain_area_intensities === 'object') {
          const intensities = f.pain_area_intensities as Record<string, { intensity: number; isNew?: boolean }>;
          Object.entries(intensities).forEach(([area, data]) => {
            if (!painAreaMap.has(area)) painAreaMap.set(area, []);
            painAreaMap.get(area)!.push({
              date: f.training_date,
              intensity: data.intensity,
              isNew: data.isNew ?? true,
            });
          });
        } else if (f.pain_area) {
          // Fallback for simple pain_area string
          const areas = f.pain_area.split(',').map(a => a.trim());
          areas.forEach(area => {
            if (!painAreaMap.has(area)) painAreaMap.set(area, []);
            painAreaMap.get(area)!.push({
              date: f.training_date,
              intensity: f.pain ?? 5,
              isNew: true,
            });
          });
        }
      });
      
      const painAreaHistory: PainAreaHistory[] = Array.from(painAreaMap.entries()).map(([area, occurrences]) => {
        const sorted = occurrences.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const avgIntensity = safeAverage(sorted.map(o => o.intensity));
        
        // Calculate trend (compare first half vs second half intensities)
        const mid = Math.floor(sorted.length / 2);
        const recentIntensity = safeAverage(sorted.slice(0, Math.max(1, mid)).map(o => o.intensity));
        const olderIntensity = safeAverage(sorted.slice(mid).map(o => o.intensity));
        
        let trend: PainAreaHistory['trend'] = 'unknown';
        if (recentIntensity != null && olderIntensity != null && sorted.length >= 3) {
          if (recentIntensity > olderIntensity + 1) trend = 'worsening';
          else if (recentIntensity < olderIntensity - 1) trend = 'improving';
          else trend = 'stable';
        }
        
        return {
          area,
          occurrences: sorted,
          totalCount: sorted.length,
          averageIntensity: avgIntensity,
          isRecurring: sorted.length >= 3,
          lastOccurrence: sorted[0]?.date ?? null,
          trend,
        };
      }).sort((a, b) => b.totalCount - a.totalCount);
      
      // =====================================================================
      // Enjoyment Trend
      // =====================================================================
      const funValues = feedbacks.map(f => f.fun).filter((v): v is number => v != null);
      const recentFun = funValues.slice(0, Math.max(3, Math.floor(funValues.length / 2)));
      const olderFun = funValues.slice(Math.floor(funValues.length / 2));
      
      const currentFunAvg = safeAverage(recentFun);
      const previousFunAvg = safeAverage(olderFun);
      
      let funTrend: EnjoymentTrend['trend'] = 'unknown';
      if (currentFunAvg != null && previousFunAvg != null) {
        if (currentFunAvg > previousFunAvg + 0.5) funTrend = 'up';
        else if (currentFunAvg < previousFunAvg - 0.5) funTrend = 'declining';
        else funTrend = 'stable';
      }
      
      // Count consecutive low fun scores (≤4)
      let consecutiveLowCount = 0;
      for (const fun of recentFun) {
        if (fun <= 4) consecutiveLowCount++;
        else break;
      }
      
      const isWarning = consecutiveLowCount >= 3 || (funTrend === 'declining' && currentFunAvg != null && currentFunAvg < 5);
      let warningMessage: string | null = null;
      if (isWarning) {
        if (consecutiveLowCount >= 3) {
          warningMessage = `${consecutiveLowCount}× nízká motivace v řadě – riziko dropoutu`;
        } else {
          warningMessage = 'Klesající motivace – zvážit změnu programu';
        }
      }
      
      const enjoymentTrend: EnjoymentTrend = {
        currentAvg: currentFunAvg,
        previousAvg: previousFunAvg,
        trend: funTrend,
        isWarning,
        warningMessage,
        consecutiveLowCount,
      };
      
      return {
        recovery: latestRecovery,
        sleepImpact,
        painAreaHistory,
        enjoymentTrend,
        feedbackCount: feedbacks.length,
      };
    },
    enabled: !!clientId,
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================================================
// Export individual calculation functions for use elsewhere
// ============================================================================

export { scoreSleepQuality };
