/**
 * Red Flag Engine
 * 
 * Centralized rules for detecting concerning patterns in client feedback
 * that require trainer attention.
 */

export interface RedFlagRule {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  category: 'pain' | 'energy' | 'recovery' | 'pattern';
}

export interface RedFlagResult {
  rule: RedFlagRule;
  triggered: boolean;
  value?: number | string;
  message: string;
}

export interface FeedbackForEvaluation {
  pain?: number | null;
  body_feel?: number | null;
  energy?: number | null;
  soreness?: number | null;
  difficulty?: number | null;
  sleep_hours?: number | null;
  pain_area?: string | null;
  is_red_flag?: boolean;
  training_date?: string;
}

// Default thresholds (can be overridden by user settings)
export const DEFAULT_THRESHOLDS = {
  painHigh: 7,
  bodyFeelLow: 3,
  energyLow: 3,
  sorenessHigh: 8,
  sleepHoursLow: 5,
};

export const RED_FLAG_RULES: RedFlagRule[] = [
  {
    id: 'high_non_muscle_pain',
    name: 'Vysoká bolest mimo svaly',
    description: 'Bolest v kloubech/šlachách ≥ 7/10',
    severity: 'high',
    category: 'pain',
  },
  {
    id: 'low_body_feel',
    name: 'Špatný celkový pocit',
    description: 'Celkový pocit v těle ≤ 3/10',
    severity: 'medium',
    category: 'recovery',
  },
  {
    id: 'low_energy',
    name: 'Nízká energie',
    description: 'Úroveň energie ≤ 3/10',
    severity: 'medium',
    category: 'energy',
  },
  {
    id: 'extreme_soreness',
    name: 'Extrémní svalová bolest',
    description: 'Svalová bolest ≥ 8/10',
    severity: 'medium',
    category: 'recovery',
  },
  {
    id: 'sleep_deprivation',
    name: 'Nedostatek spánku',
    description: 'Méně než 5 hodin spánku',
    severity: 'low',
    category: 'recovery',
  },
  {
    id: 'high_rpe_low_energy',
    name: 'Vysoká zátěž při nízké energii',
    description: 'RPE ≥ 8 při energii ≤ 4',
    severity: 'high',
    category: 'pattern',
  },
  {
    id: 'new_pain_location',
    name: 'Nová bolest',
    description: 'Bolest v nové oblasti těla',
    severity: 'high',
    category: 'pain',
  },
];

export function evaluateFeedback(
  feedback: FeedbackForEvaluation,
  thresholds = DEFAULT_THRESHOLDS
): RedFlagResult[] {
  const results: RedFlagResult[] = [];

  // High non-muscle pain
  if (feedback.pain != null && feedback.pain >= thresholds.painHigh) {
    results.push({
      rule: RED_FLAG_RULES.find(r => r.id === 'high_non_muscle_pain')!,
      triggered: true,
      value: feedback.pain,
      message: `Bolest mimo svaly: ${feedback.pain}/10${feedback.pain_area ? ` (${feedback.pain_area})` : ''}`,
    });
  }

  // Low body feel
  if (feedback.body_feel != null && feedback.body_feel <= thresholds.bodyFeelLow) {
    results.push({
      rule: RED_FLAG_RULES.find(r => r.id === 'low_body_feel')!,
      triggered: true,
      value: feedback.body_feel,
      message: `Celkový pocit v těle: ${feedback.body_feel}/10`,
    });
  }

  // Low energy
  if (feedback.energy != null && feedback.energy <= thresholds.energyLow) {
    results.push({
      rule: RED_FLAG_RULES.find(r => r.id === 'low_energy')!,
      triggered: true,
      value: feedback.energy,
      message: `Nízká energie: ${feedback.energy}/10`,
    });
  }

  // Extreme soreness
  if (feedback.soreness != null && feedback.soreness >= thresholds.sorenessHigh) {
    results.push({
      rule: RED_FLAG_RULES.find(r => r.id === 'extreme_soreness')!,
      triggered: true,
      value: feedback.soreness,
      message: `Svalová bolest: ${feedback.soreness}/10`,
    });
  }

  // Sleep deprivation
  if (feedback.sleep_hours != null && feedback.sleep_hours < thresholds.sleepHoursLow) {
    results.push({
      rule: RED_FLAG_RULES.find(r => r.id === 'sleep_deprivation')!,
      triggered: true,
      value: feedback.sleep_hours,
      message: `Spánek: ${feedback.sleep_hours} hodin`,
    });
  }

  // High RPE with low energy (pattern detection)
  if (
    feedback.difficulty != null &&
    feedback.energy != null &&
    feedback.difficulty >= 8 &&
    feedback.energy <= 4
  ) {
    results.push({
      rule: RED_FLAG_RULES.find(r => r.id === 'high_rpe_low_energy')!,
      triggered: true,
      value: `RPE ${feedback.difficulty}, energie ${feedback.energy}`,
      message: `Vysoká zátěž (${feedback.difficulty}/10) při nízké energii (${feedback.energy}/10)`,
    });
  }

  return results;
}

export function hasHighSeverityFlag(results: RedFlagResult[]): boolean {
  return results.some(r => r.triggered && r.rule.severity === 'high');
}

export function getRedFlagSummary(results: RedFlagResult[]): string {
  const triggered = results.filter(r => r.triggered);
  if (triggered.length === 0) return '';
  
  const highCount = triggered.filter(r => r.rule.severity === 'high').length;
  const mediumCount = triggered.filter(r => r.rule.severity === 'medium').length;
  
  const parts: string[] = [];
  if (highCount > 0) parts.push(`${highCount} závažn${highCount === 1 ? 'ý' : 'é'}`);
  if (mediumCount > 0) parts.push(`${mediumCount} střední`);
  
  return parts.join(', ');
}

// Detect patterns across multiple feedbacks
export function detectPatterns(
  feedbacks: FeedbackForEvaluation[],
  lookbackDays = 14
): RedFlagResult[] {
  const results: RedFlagResult[] = [];
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);
  
  const recentFeedbacks = feedbacks.filter(f => 
    f.training_date && new Date(f.training_date) >= cutoffDate
  );

  if (recentFeedbacks.length < 2) return results;

  // Check for consecutive low energy
  const lowEnergyCount = recentFeedbacks.filter(f => 
    f.energy != null && f.energy <= 4
  ).length;
  
  if (lowEnergyCount >= 3) {
    results.push({
      rule: {
        id: 'consecutive_low_energy',
        name: 'Opakovaná nízká energie',
        description: `${lowEnergyCount}× nízká energie za ${lookbackDays} dní`,
        severity: 'high',
        category: 'pattern',
      },
      triggered: true,
      value: lowEnergyCount,
      message: `${lowEnergyCount}× nízká energie v posledních ${lookbackDays} dnech`,
    });
  }

  // Check for recurring pain in same area
  const painAreas = recentFeedbacks
    .filter(f => f.pain_area && f.pain != null && f.pain >= 5)
    .map(f => f.pain_area!);
  
  const areaCounts = painAreas.reduce((acc, area) => {
    acc[area] = (acc[area] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  for (const [area, count] of Object.entries(areaCounts)) {
    if (count >= 2) {
      results.push({
        rule: {
          id: 'recurring_pain',
          name: 'Opakovaná bolest',
          description: `Bolest v oblasti "${area}" se opakuje`,
          severity: 'high',
          category: 'pattern',
        },
        triggered: true,
        value: count,
        message: `${count}× bolest v oblasti "${area}"`,
      });
    }
  }

  return results;
}
