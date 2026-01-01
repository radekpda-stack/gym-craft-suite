/**
 * Rule-based coach suggestions for feedback analysis
 */

import { calculateSessionLoad, safeAverage, isSessionLoadSpike } from './feedbackCalculations';

export interface FeedbackData {
  rpe_rating?: number | null;
  session_fit?: number | null;
  pain?: number | null;
  pain_areas?: string[] | null;
  limiting_factor?: string | null;
  doms_level?: number | null;
  readiness_level?: number | null;
}

export interface TrainingData {
  duration_minutes?: number | null;
}

export interface CoachSuggestion {
  id: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  category: 'volume' | 'technique' | 'pain' | 'recovery' | 'load';
}

// Joint/sensitive areas that trigger pain warnings
const SENSITIVE_PAIN_AREAS = [
  'shoulder', 'rameno',
  'knee', 'koleno', 
  'lower_back', 'bedra', 'záda',
  'hip', 'kyčel',
  'elbow', 'loket',
  'wrist', 'zápěstí',
  'ankle', 'kotník'
];

/**
 * Generate coach suggestions based on feedback data
 */
export function getCoachSuggestions(
  feedback: FeedbackData,
  training?: TrainingData,
  historicalLoads?: (number | null | undefined)[]
): CoachSuggestion[] {
  const suggestions: CoachSuggestion[] = [];
  
  const rpe = feedback.rpe_rating ?? 0;
  const sessionFit = feedback.session_fit ?? 10;
  const pain = feedback.pain ?? 0;
  const limitingFactor = feedback.limiting_factor;
  const painAreas = feedback.pain_areas ?? [];
  const domsLevel = feedback.doms_level ?? 0;
  const readinessLevel = feedback.readiness_level ?? 10;
  
  // Rule 1: High RPE with low session fit → reduce volume/intensity
  if (rpe >= 8 && sessionFit <= 6) {
    suggestions.push({
      id: 'reduce_volume',
      message: 'Příště uber objem 10–20% nebo intenzitu.',
      priority: 'high',
      category: 'volume'
    });
  }
  
  // Rule 2: Limiting factor is technique → focus on technique
  if (limitingFactor === 'technique') {
    suggestions.push({
      id: 'focus_technique',
      message: 'Příště technické série + delší pauzy.',
      priority: 'medium',
      category: 'technique'
    });
  }
  
  // Rule 3: Limiting factor is cardio/breath → cardio progression
  if (limitingFactor === 'cardio_breath') {
    suggestions.push({
      id: 'cardio_focus',
      message: 'Zvažte přidat více kardio bloků nebo zkrátit pauzy postupně.',
      priority: 'low',
      category: 'volume'
    });
  }
  
  // Rule 4: High pain or sensitive area pain → avoid provocative patterns
  const hasSensitivePain = painAreas.some(area => 
    SENSITIVE_PAIN_AREAS.some(sensitive => 
      area.toLowerCase().includes(sensitive.toLowerCase())
    )
  );
  
  if (pain >= 5 || hasSensitivePain) {
    suggestions.push({
      id: 'avoid_pain_pattern',
      message: 'Příště vynechat provokační pattern, náhrada šetrnou variantou.',
      priority: 'high',
      category: 'pain'
    });
  }
  
  // Rule 5: Session load spike detection
  if (training?.duration_minutes && historicalLoads && historicalLoads.length >= 3) {
    const currentLoad = calculateSessionLoad(rpe, training.duration_minutes);
    
    if (currentLoad && isSessionLoadSpike(currentLoad, historicalLoads)) {
      suggestions.push({
        id: 'load_spike',
        message: 'Pozor: skok zátěže, zvaž deload/úpravu.',
        priority: 'high',
        category: 'load'
      });
    }
  }
  
  // Rule 6: High DOMS → consider recovery
  if (domsLevel >= 8) {
    suggestions.push({
      id: 'high_doms',
      message: 'Vysoká svalová únava – zvažte lehčí aktivní regeneraci.',
      priority: 'medium',
      category: 'recovery'
    });
  }
  
  // Rule 7: Low readiness → adjust next session
  if (readinessLevel <= 3) {
    suggestions.push({
      id: 'low_readiness',
      message: 'Nízká připravenost – příští trénink přizpůsobte aktuálnímu stavu.',
      priority: 'high',
      category: 'recovery'
    });
  }
  
  // Rule 8: Pain + joint limiting factor → specialist consideration
  if (pain >= 6 && limitingFactor === 'pain_joint') {
    suggestions.push({
      id: 'consider_specialist',
      message: 'Opakovaná kloubní bolest – zvažte konzultaci s fyzioterapeutem.',
      priority: 'high',
      category: 'pain'
    });
  }
  
  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  return suggestions;
}

/**
 * Get a single summarized coach message (for compact display)
 */
export function getCoachSummary(
  feedback: FeedbackData,
  training?: TrainingData,
  historicalLoads?: (number | null | undefined)[]
): string | null {
  const suggestions = getCoachSuggestions(feedback, training, historicalLoads);
  
  if (suggestions.length === 0) return null;
  
  // Return the highest priority suggestion
  return suggestions[0].message;
}

/**
 * Limiting factor display labels (Czech)
 */
export const LIMITING_FACTOR_LABELS: Record<string, string> = {
  cardio_breath: 'Kondice / dech',
  strength: 'Síla',
  technique: 'Technika',
  pain_joint: 'Bolest / klouby',
  motivation: 'Motivace',
  none: 'Žádný limit'
};

/**
 * Pain timing display labels (Czech)
 */
export const PAIN_TIMING_LABELS: Record<string, string> = {
  during: 'Během tréninku',
  after: 'Po tréninku',
  evening: 'Večer'
};
