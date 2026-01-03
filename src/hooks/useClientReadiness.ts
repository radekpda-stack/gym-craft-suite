/**
 * Client Readiness Hook
 * 
 * Calculates readiness score based on:
 * - Last feedback (pain, fatigue, body feel)
 * - Days since last training
 * - Sleep quality (if available)
 * - Training streak
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, startOfWeek, subWeeks } from 'date-fns';

export interface ScoreBreakdownItem {
  label: string;
  value: number;
  type: 'base' | 'positive' | 'negative';
}

export interface ClientReadinessData {
  // Core metrics
  readinessScore: number; // 0-100
  readinessLevel: 'high' | 'medium' | 'low' | 'unknown';
  
  // Score breakdown for UI
  scoreBreakdown: ScoreBreakdownItem[];
  
  // Time since last training
  daysSinceLastTraining: number | null;
  lastTrainingDate: string | null;
  
  // Training consistency
  trainingStreak: number; // weeks in a row
  adherenceRate: number; // % of planned vs completed last 30 days
  trainingsThisMonth: number;
  trainingsLastMonth: number;
  
  // Last feedback data
  lastFeedback: {
    date: string;
    pain: number;
    fatigue: number;
    bodyFeel: number;
    soreness: number;
    isRedFlag: boolean;
  } | null;
  
  // Recommendations
  intensityRecommendation: 'reduce' | 'normal' | 'increase' | 'deload';
  warnings: string[];
}

export function useClientReadiness(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-readiness', clientId],
    queryFn: async (): Promise<ClientReadinessData> => {
      if (!clientId) throw new Error('No client ID');

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Fetch completed trainings
      const { data: trainings } = await supabase
        .from('training_sessions')
        .select('id, date, status')
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .gte('date', sixtyDaysAgo.toISOString())
        .order('date', { ascending: false });

      // Fetch last feedback
      const { data: feedback } = await supabase
        .from('training_feedback')
        .select('*')
        .eq('client_id', clientId)
        .order('training_date', { ascending: false })
        .limit(1);

      // Calculate days since last training
      const lastTraining = trainings?.[0];
      const daysSinceLastTraining = lastTraining
        ? differenceInDays(now, new Date(lastTraining.date))
        : null;

      // Calculate training counts
      const trainingsThisMonth = trainings?.filter(
        t => new Date(t.date) >= thirtyDaysAgo
      ).length || 0;

      const trainingsLastMonth = trainings?.filter(
        t => new Date(t.date) >= sixtyDaysAgo && new Date(t.date) < thirtyDaysAgo
      ).length || 0;

      // Calculate training streak (consecutive weeks with at least 1 training)
      let trainingStreak = 0;
      let currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
      
      for (let i = 0; i < 52; i++) {
        const weekStart = subWeeks(currentWeekStart, i);
        const weekEnd = subWeeks(currentWeekStart, i - 1);
        
        const hasTrainingThisWeek = trainings?.some(t => {
          const date = new Date(t.date);
          return date >= weekStart && date < weekEnd;
        });
        
        if (hasTrainingThisWeek) {
          trainingStreak++;
        } else if (i > 0) {
          break;
        }
      }

      // Parse last feedback
      const lastFeedbackData = feedback?.[0];
      const lastFeedbackParsed = lastFeedbackData ? {
        date: lastFeedbackData.training_date,
        pain: lastFeedbackData.pain || 0,
        fatigue: lastFeedbackData.fatigue_level || 0,
        bodyFeel: lastFeedbackData.body_feel || 5,
        soreness: lastFeedbackData.soreness || 0,
        isRedFlag: lastFeedbackData.is_red_flag || false,
      } : null;

      // Calculate readiness score with breakdown
      let readinessScore = 70; // Base score
      const warnings: string[] = [];
      const scoreBreakdown: ScoreBreakdownItem[] = [
        { label: 'Základní skóre', value: 70, type: 'base' }
      ];

      // Adjust based on rest days
      if (daysSinceLastTraining !== null) {
        if (daysSinceLastTraining === 0) {
          readinessScore -= 15;
          scoreBreakdown.push({ label: 'Trénink dnes', value: -15, type: 'negative' });
          warnings.push('Trénoval dnes');
        } else if (daysSinceLastTraining === 1) {
          readinessScore -= 5;
          scoreBreakdown.push({ label: 'Krátký odpočinek (1 den)', value: -5, type: 'negative' });
        } else if (daysSinceLastTraining >= 2 && daysSinceLastTraining <= 3) {
          readinessScore += 10;
          scoreBreakdown.push({ label: 'Optimální odpočinek', value: +10, type: 'positive' });
        } else if (daysSinceLastTraining >= 7) {
          readinessScore -= 10;
          scoreBreakdown.push({ label: `Dlouhá pauza (${daysSinceLastTraining} dní)`, value: -10, type: 'negative' });
          warnings.push(`${daysSinceLastTraining} dní od posledního tréninku`);
        }
      }

      // Adjust based on feedback
      if (lastFeedbackParsed) {
        if (lastFeedbackParsed.pain >= 7) {
          readinessScore -= 25;
          scoreBreakdown.push({ label: 'Vysoká bolest', value: -25, type: 'negative' });
          warnings.push('Vysoká bolest z posledního tréninku');
        } else if (lastFeedbackParsed.pain >= 5) {
          readinessScore -= 10;
          scoreBreakdown.push({ label: 'Střední bolest', value: -10, type: 'negative' });
        }

        if (lastFeedbackParsed.soreness >= 8) {
          readinessScore -= 15;
          scoreBreakdown.push({ label: 'Silná svalovka', value: -15, type: 'negative' });
          warnings.push('Silná svalovka');
        } else if (lastFeedbackParsed.soreness >= 6) {
          readinessScore -= 5;
          scoreBreakdown.push({ label: 'Mírná svalovka', value: -5, type: 'negative' });
        }

        if (lastFeedbackParsed.bodyFeel >= 8) {
          readinessScore += 10;
          scoreBreakdown.push({ label: 'Skvělý pocit z těla', value: +10, type: 'positive' });
        } else if (lastFeedbackParsed.bodyFeel <= 4) {
          readinessScore -= 10;
          scoreBreakdown.push({ label: 'Špatný pocit z těla', value: -10, type: 'negative' });
          warnings.push('Špatný pocit z těla');
        }

        if (lastFeedbackParsed.isRedFlag) {
          readinessScore -= 20;
          scoreBreakdown.push({ label: 'Red flag', value: -20, type: 'negative' });
          warnings.push('Red flag ve feedbacku');
        }
      }

      // Clamp score
      readinessScore = Math.max(0, Math.min(100, readinessScore));

      // Determine readiness level
      let readinessLevel: 'high' | 'medium' | 'low' | 'unknown' = 'unknown';
      if (lastFeedbackParsed || daysSinceLastTraining !== null) {
        if (readinessScore >= 75) readinessLevel = 'high';
        else if (readinessScore >= 50) readinessLevel = 'medium';
        else readinessLevel = 'low';
      }

      // Intensity recommendation
      let intensityRecommendation: 'reduce' | 'normal' | 'increase' | 'deload' = 'normal';
      if (readinessScore < 40) {
        intensityRecommendation = 'deload';
      } else if (readinessScore < 60) {
        intensityRecommendation = 'reduce';
      } else if (readinessScore >= 85 && trainingStreak >= 4) {
        intensityRecommendation = 'increase';
      }

      // Calculate adherence (simple: compare this month vs last month)
      const adherenceRate = trainingsLastMonth > 0 
        ? Math.round((trainingsThisMonth / trainingsLastMonth) * 100)
        : trainingsThisMonth > 0 ? 100 : 0;

      return {
        readinessScore,
        readinessLevel,
        scoreBreakdown,
        daysSinceLastTraining,
        lastTrainingDate: lastTraining?.date || null,
        trainingStreak,
        adherenceRate: Math.min(adherenceRate, 150), // Cap at 150%
        trainingsThisMonth,
        trainingsLastMonth,
        lastFeedback: lastFeedbackParsed,
        intensityRecommendation,
        warnings,
      };
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });
}
