import { useMemo } from 'react';
import { useClientFeedback } from './useTrainingFeedback';
import { subDays, isAfter } from 'date-fns';

export type FeedbackStatus = 'ok' | 'fatigue' | 'overload' | 'unknown';
export type FeedbackTrend = 'improving' | 'stable' | 'declining' | 'unknown';

export interface FeedbackEvaluation {
  status: FeedbackStatus;
  trend: FeedbackTrend;
  hasRecent: boolean;
  lastFeedbackDate?: string;
  warningSignals: string[];
  summary: string;
  avgBodyFeel?: number;
  avgEnergy?: number;
  avgPain?: number;
  avgDifficulty?: number;
  feedbackCount: number;
  redFlagCount: number;
}

export function useFeedbackEvaluation(clientId: string | undefined) {
  const { data: feedback = [], isLoading } = useClientFeedback(clientId);

  const evaluation = useMemo((): FeedbackEvaluation => {
    if (feedback.length === 0) {
      return {
        status: 'unknown',
        trend: 'unknown',
        hasRecent: false,
        warningSignals: [],
        summary: 'Zatím žádný feedback',
        feedbackCount: 0,
        redFlagCount: 0,
      };
    }

    const sevenDaysAgo = subDays(new Date(), 7);
    const recentFeedback = feedback.filter(f => 
      isAfter(new Date(f.training_date || f.created_at), sevenDaysAgo)
    );

    const hasRecent = recentFeedback.length > 0;
    const lastFeedback = feedback[0];
    const lastFeedbackDate = lastFeedback?.training_date || lastFeedback?.created_at;

    // Calculate averages from last 5 feedbacks
    const last5 = feedback.slice(0, 5);
    const prev5 = feedback.slice(5, 10);

    const calcAvg = (items: typeof feedback, field: string) => {
      const values = items.map(i => Number((i as any)[field]) || 0).filter(v => v > 0);
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    };

    const avgBodyFeel = calcAvg(last5, 'body_feel');
    const avgEnergy = calcAvg(last5, 'energy');
    const avgPain = calcAvg(last5, 'pain');
    const avgDifficulty = calcAvg(last5, 'difficulty');
    const avgFatigue = calcAvg(last5, 'fatigue_level');

    const prevAvgBodyFeel = calcAvg(prev5, 'body_feel');
    const prevAvgEnergy = calcAvg(prev5, 'energy');
    const prevAvgPain = calcAvg(prev5, 'pain');

    // Warning signals
    const warningSignals: string[] = [];
    
    // Check recent pain
    const recentHighPain = recentFeedback.filter(f => f.pain && f.pain >= 6);
    if (recentHighPain.length >= 2) {
      warningSignals.push('Opakovaná bolest');
    }

    // Check low energy
    if (avgEnergy > 0 && avgEnergy <= 4) {
      warningSignals.push('Nízká energie');
    }

    // Check poor body feel
    if (avgBodyFeel > 0 && avgBodyFeel <= 4) {
      warningSignals.push('Špatný pocit v těle');
    }

    // Red flags (high pain >= 7 or body_feel <= 3)
    const redFlagCount = recentFeedback.filter(f => 
      (f.pain && f.pain >= 7) || (f.body_feel && f.body_feel <= 3) || f.is_red_flag
    ).length;

    if (redFlagCount > 0) {
      warningSignals.push(`${redFlagCount}x červený signál`);
    }

    // High fatigue
    if (avgFatigue >= 8) {
      warningSignals.push('Vysoká únava');
    }

    // Determine status
    let status: FeedbackStatus = 'ok';
    
    if (redFlagCount >= 2 || (avgPain >= 6 && avgBodyFeel <= 4)) {
      status = 'overload';
    } else if (warningSignals.length >= 2 || avgFatigue >= 7 || avgEnergy <= 4) {
      status = 'fatigue';
    }

    // Determine trend
    let trend: FeedbackTrend = 'stable';
    
    if (prev5.length >= 3) {
      const bodyFeelDiff = avgBodyFeel - prevAvgBodyFeel;
      const energyDiff = avgEnergy - prevAvgEnergy;
      const painDiff = avgPain - prevAvgPain;

      const improvementScore = 
        (bodyFeelDiff > 0.5 ? 1 : bodyFeelDiff < -0.5 ? -1 : 0) +
        (energyDiff > 0.5 ? 1 : energyDiff < -0.5 ? -1 : 0) +
        (painDiff < -0.5 ? 1 : painDiff > 0.5 ? -1 : 0);

      if (improvementScore >= 2) trend = 'improving';
      else if (improvementScore <= -2) trend = 'declining';
    }

    // Generate summary
    let summary: string;
    if (status === 'overload') {
      summary = 'Přetížení – doporučena regenerace';
    } else if (status === 'fatigue') {
      summary = 'Únava – zvážit snížení zátěže';
    } else if (trend === 'improving') {
      summary = 'V pořádku, zlepšující se trend';
    } else if (trend === 'declining') {
      summary = 'V pořádku, ale klesající trend';
    } else {
      summary = 'V pořádku, stabilní';
    }

    return {
      status,
      trend,
      hasRecent,
      lastFeedbackDate,
      warningSignals,
      summary,
      avgBodyFeel: avgBodyFeel || undefined,
      avgEnergy: avgEnergy || undefined,
      avgPain: avgPain || undefined,
      avgDifficulty: avgDifficulty || undefined,
      feedbackCount: feedback.length,
      redFlagCount,
    };
  }, [feedback]);

  return { evaluation, isLoading, feedback };
}
