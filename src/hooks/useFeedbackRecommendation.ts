import { useMemo } from 'react';

export type RecommendationLevel = 'green' | 'yellow' | 'red';

export interface FeedbackRecommendation {
  level: RecommendationLevel;
  label: string;
  reasons: string[];
}

interface FeedbackValues {
  pain?: number | null;
  pain_type?: 'muscle' | 'joint' | 'tendon' | null;
  energy_rating?: number | null;
  body_feel?: number | null;
  soreness?: number | null;
  difficulty?: number | null;
  sleep_after?: 'poor' | 'average' | 'good' | null;
  sleep_hours?: number | null;
  fun?: number | null;
  is_red_flag?: boolean;
}

interface RecommendationThresholds {
  painHigh: number;
  painMedium: number;
  energyLow: number;
  bodyFeelLow: number;
  sorenessHigh: number;
  difficultyHigh: number;
}

const DEFAULT_THRESHOLDS: RecommendationThresholds = {
  painHigh: 7,
  painMedium: 4,
  energyLow: 4,
  bodyFeelLow: 3,
  sorenessHigh: 8,
  difficultyHigh: 9,
};

export function calculateRecommendation(
  feedback: FeedbackValues,
  thresholds: RecommendationThresholds = DEFAULT_THRESHOLDS
): FeedbackRecommendation {
  const reasons: string[] = [];
  let level: RecommendationLevel = 'green';

  // RED level conditions
  if (feedback.is_red_flag) {
    level = 'red';
    reasons.push('Red flag označen');
  }

  if (feedback.pain && feedback.pain >= thresholds.painHigh) {
    level = 'red';
    reasons.push(`Vysoká bolest (${feedback.pain}/10)`);
  }

  if (feedback.pain_type === 'joint' && feedback.pain && feedback.pain >= thresholds.painMedium) {
    level = 'red';
    reasons.push('Kloubní bolest');
  }

  if (feedback.pain_type === 'tendon' && feedback.pain && feedback.pain >= thresholds.painMedium) {
    level = 'red';
    reasons.push('Šlachová bolest');
  }

  if (feedback.body_feel && feedback.body_feel <= thresholds.bodyFeelLow) {
    level = 'red';
    reasons.push(`Špatný pocit v těle (${feedback.body_feel}/10)`);
  }

  // Check for sleep deprivation as red flag
  if (feedback.sleep_hours != null && feedback.sleep_hours < 5) {
    level = 'red';
    reasons.push(`Kritický nedostatek spánku (${feedback.sleep_hours}h)`);
  }

  // YELLOW level conditions (only if not already red)
  if (level !== 'red') {
    if (feedback.energy_rating && feedback.energy_rating <= thresholds.energyLow) {
      level = 'yellow';
      reasons.push(`Nízká energie (${feedback.energy_rating}/10)`);
    }

    if (feedback.soreness && feedback.soreness >= thresholds.sorenessHigh) {
      level = 'yellow';
      reasons.push(`Vysoká svalovka (${feedback.soreness}/10)`);
    }

    if (feedback.difficulty && feedback.difficulty >= thresholds.difficultyHigh) {
      level = 'yellow';
      reasons.push(`Vysoká obtížnost (${feedback.difficulty}/10)`);
    }

    if (feedback.sleep_after === 'poor') {
      level = 'yellow';
      reasons.push('Špatný spánek po tréninku');
    }

    if (feedback.pain && feedback.pain >= thresholds.painMedium && feedback.pain < thresholds.painHigh) {
      level = 'yellow';
      reasons.push(`Střední bolest (${feedback.pain}/10)`);
    }
  }

  const labels: Record<RecommendationLevel, string> = {
    green: 'Bez omezení',
    yellow: 'Upravit objem/intenzitu',
    red: 'Pozor – bolest/únava',
  };

  return {
    level,
    label: labels[level],
    reasons: reasons.length > 0 ? reasons : ['Vše v pořádku'],
  };
}

export function useFeedbackRecommendation(
  feedback: FeedbackValues | null | undefined,
  thresholds?: Partial<RecommendationThresholds>
): FeedbackRecommendation | null {
  return useMemo(() => {
    if (!feedback) return null;
    
    const mergedThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
    return calculateRecommendation(feedback, mergedThresholds);
  }, [feedback, thresholds]);
}
