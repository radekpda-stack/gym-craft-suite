/**
 * Red Flag Engine
 * 
 * Centralized rules for detecting concerning patterns in client feedback
 * that require trainer attention.
 * 
 * Updated with new rules per dashboard requirements:
 * - pain_during >= 5 -> "pain_during_high"
 * - doms_level >= 8 -> "doms_high"
 * - readiness_level <= 3 -> "readiness_low"
 * - session_load spike > 20% -> "session_load_spike"
 */

import { calculateSessionLoad, safeAverage, isSessionLoadSpike } from './feedbackCalculations';

export interface RedFlagRule {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  category: 'pain' | 'energy' | 'recovery' | 'pattern' | 'load';
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
  rpe_rating?: number | null;
  sleep_hours?: number | null;
  pain_area?: string | null;
  pain_areas?: string[] | null;
  is_red_flag?: boolean;
  training_date?: string;
  // New fields for enhanced feedback
  doms_level?: number | null;
  readiness_level?: number | null;
  session_fit?: number | null;
  limiting_factor?: string | null;
}

// Default thresholds (can be overridden by user settings)
export const DEFAULT_THRESHOLDS = {
  painHigh: 5,           // Updated: was 7, now 5 per new requirements
  painCritical: 7,
  bodyFeelLow: 3,
  energyLow: 3,
  sorenessHigh: 8,
  domsHigh: 8,           // New
  readinessLow: 3,       // New
  sleepHoursLow: 5,
  sessionLoadSpikePercent: 20, // New
};

export const RED_FLAG_RULES: RedFlagRule[] = [
  // === PAIN RULES ===
  {
    id: 'pain_during_high',
    name: 'Vysoká bolest při tréninku',
    description: 'Bolest při tréninku ≥ 5/10',
    severity: 'high',
    category: 'pain',
  },
  {
    id: 'high_non_muscle_pain',
    name: 'Vysoká bolest mimo svaly',
    description: 'Bolest v kloubech/šlachách ≥ 7/10',
    severity: 'high',
    category: 'pain',
  },
  {
    id: 'new_pain_location',
    name: 'Nová bolest',
    description: 'Bolest v nové oblasti těla',
    severity: 'high',
    category: 'pain',
  },
  
  // === RECOVERY RULES ===
  {
    id: 'doms_high',
    name: 'Vysoká svalová únava (DOMS)',
    description: 'DOMS ≥ 8/10 následující den',
    severity: 'medium',
    category: 'recovery',
  },
  {
    id: 'readiness_low',
    name: 'Nízká připravenost',
    description: 'Readiness ≤ 3/10 následující den',
    severity: 'high',
    category: 'recovery',
  },
  {
    id: 'low_body_feel',
    name: 'Špatný celkový pocit',
    description: 'Celkový pocit v těle ≤ 3/10',
    severity: 'medium',
    category: 'recovery',
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
  
  // === ENERGY RULES ===
  {
    id: 'low_energy',
    name: 'Nízká energie',
    description: 'Úroveň energie ≤ 3/10',
    severity: 'medium',
    category: 'energy',
  },
  
  // === PATTERN / LOAD RULES ===
  {
    id: 'session_load_spike',
    name: 'Skok zátěže',
    description: 'Session load > 20% oproti průměru 14 dní',
    severity: 'high',
    category: 'load',
  },
  {
    id: 'high_rpe_low_energy',
    name: 'Vysoká zátěž při nízké energii',
    description: 'RPE ≥ 8 při energii ≤ 4',
    severity: 'high',
    category: 'pattern',
  },
  {
    id: 'high_rpe_low_fit',
    name: 'Vysoká zátěž při nízkém session fit',
    description: 'RPE ≥ 8 při session fit ≤ 6',
    severity: 'medium',
    category: 'pattern',
  },
];

/**
 * Get a rule by ID
 */
function getRule(id: string): RedFlagRule | undefined {
  return RED_FLAG_RULES.find(r => r.id === id);
}

/**
 * Evaluate a single feedback for red flags
 */
export function evaluateFeedback(
  feedback: FeedbackForEvaluation,
  thresholds = DEFAULT_THRESHOLDS,
  historicalLoads?: (number | null | undefined)[],
  durationMinutes?: number
): RedFlagResult[] {
  const results: RedFlagResult[] = [];
  
  // Get pain value (support both old and new field names)
  const pain = feedback.pain ?? 0;
  const painArea = feedback.pain_area || (feedback.pain_areas?.[0] ?? null);

  // === PAIN RULES ===
  
  // Pain during high (NEW - primary rule)
  if (pain >= thresholds.painHigh) {
    results.push({
      rule: getRule('pain_during_high')!,
      triggered: true,
      value: pain,
      message: `Bolest při tréninku: ${pain}/10${painArea ? ` (${painArea})` : ''}`,
    });
  }

  // High non-muscle pain (critical threshold)
  if (pain >= thresholds.painCritical) {
    results.push({
      rule: getRule('high_non_muscle_pain')!,
      triggered: true,
      value: pain,
      message: `Vysoká bolest: ${pain}/10${painArea ? ` (${painArea})` : ''}`,
    });
  }

  // === RECOVERY RULES ===

  // DOMS high (NEW)
  if (feedback.doms_level != null && feedback.doms_level >= thresholds.domsHigh) {
    results.push({
      rule: getRule('doms_high')!,
      triggered: true,
      value: feedback.doms_level,
      message: `Vysoká svalová únava (DOMS): ${feedback.doms_level}/10`,
    });
  }

  // Readiness low (NEW)
  if (feedback.readiness_level != null && feedback.readiness_level <= thresholds.readinessLow) {
    results.push({
      rule: getRule('readiness_low')!,
      triggered: true,
      value: feedback.readiness_level,
      message: `Nízká připravenost: ${feedback.readiness_level}/10`,
    });
  }

  // Low body feel
  if (feedback.body_feel != null && feedback.body_feel <= thresholds.bodyFeelLow) {
    results.push({
      rule: getRule('low_body_feel')!,
      triggered: true,
      value: feedback.body_feel,
      message: `Celkový pocit v těle: ${feedback.body_feel}/10`,
    });
  }

  // Extreme soreness
  if (feedback.soreness != null && feedback.soreness >= thresholds.sorenessHigh) {
    results.push({
      rule: getRule('extreme_soreness')!,
      triggered: true,
      value: feedback.soreness,
      message: `Svalová bolest: ${feedback.soreness}/10`,
    });
  }

  // Sleep deprivation
  if (feedback.sleep_hours != null && feedback.sleep_hours < thresholds.sleepHoursLow) {
    results.push({
      rule: getRule('sleep_deprivation')!,
      triggered: true,
      value: feedback.sleep_hours,
      message: `Spánek: ${feedback.sleep_hours} hodin`,
    });
  }

  // === ENERGY RULES ===

  // Low energy
  if (feedback.energy != null && feedback.energy <= thresholds.energyLow) {
    results.push({
      rule: getRule('low_energy')!,
      triggered: true,
      value: feedback.energy,
      message: `Nízká energie: ${feedback.energy}/10`,
    });
  }

  // === PATTERN / LOAD RULES ===

  // Get RPE value (support both old and new field names)
  const rpe = feedback.rpe_rating ?? feedback.difficulty ?? 0;

  // Session load spike (NEW)
  if (historicalLoads && historicalLoads.length >= 3 && durationMinutes) {
    const currentLoad = calculateSessionLoad(rpe, durationMinutes);
    if (currentLoad && isSessionLoadSpike(currentLoad, historicalLoads, thresholds.sessionLoadSpikePercent)) {
      const avgLoad = safeAverage(historicalLoads);
      results.push({
        rule: getRule('session_load_spike')!,
        triggered: true,
        value: `${currentLoad} AU (avg: ${avgLoad?.toFixed(0) ?? '?'} AU)`,
        message: `Skok zátěže: ${currentLoad} AU (průměr ${avgLoad?.toFixed(0) ?? '?'} AU)`,
      });
    }
  }

  // High RPE with low energy (pattern detection)
  if (rpe >= 8 && feedback.energy != null && feedback.energy <= 4) {
    results.push({
      rule: getRule('high_rpe_low_energy')!,
      triggered: true,
      value: `RPE ${rpe}, energie ${feedback.energy}`,
      message: `Vysoká zátěž (${rpe}/10) při nízké energii (${feedback.energy}/10)`,
    });
  }

  // High RPE with low session fit (NEW)
  if (rpe >= 8 && feedback.session_fit != null && feedback.session_fit <= 6) {
    results.push({
      rule: getRule('high_rpe_low_fit')!,
      triggered: true,
      value: `RPE ${rpe}, session fit ${feedback.session_fit}`,
      message: `Vysoká zátěž (${rpe}/10) při nízkém session fit (${feedback.session_fit}/10)`,
    });
  }

  return results;
}

/**
 * Get array of red flag reason codes from results
 */
export function getRedFlagReasons(results: RedFlagResult[]): string[] {
  return results.filter(r => r.triggered).map(r => r.rule.id);
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

  // Check for consecutive low readiness (NEW)
  const lowReadinessCount = recentFeedbacks.filter(f => 
    f.readiness_level != null && f.readiness_level <= 3
  ).length;
  
  if (lowReadinessCount >= 2) {
    results.push({
      rule: {
        id: 'consecutive_low_readiness',
        name: 'Opakovaná nízká připravenost',
        description: `${lowReadinessCount}× nízká připravenost za ${lookbackDays} dní`,
        severity: 'high',
        category: 'pattern',
      },
      triggered: true,
      value: lowReadinessCount,
      message: `${lowReadinessCount}× nízká připravenost v posledních ${lookbackDays} dnech`,
    });
  }

  // Check for recurring pain in same area
  const painAreas = recentFeedbacks
    .filter(f => {
      const pain = f.pain ?? 0;
      const area = f.pain_area || f.pain_areas?.[0];
      return area && pain >= 5;
    })
    .map(f => f.pain_area || f.pain_areas?.[0])
    .filter((a): a is string => !!a);
  
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
