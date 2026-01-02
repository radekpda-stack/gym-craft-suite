/**
 * Analytics Sampling Configuration
 * 
 * Provides sampling for high-frequency events to reduce database load.
 * Critical events are NEVER sampled.
 */

/**
 * Events that should NEVER be sampled (always tracked)
 */
const CRITICAL_EVENTS = new Set([
  // Finance
  'credit_deducted',
  'credit_added',
  'payment_received',
  'package_purchased',
  
  // Training
  'training_confirmed',
  'training_completed',
  'training_cancelled',
  
  // Gamification
  'badge_awarded',
  'xp_awarded',
  'challenge_submitted',
  'challenge_won',
  
  // Auth
  'login',
  'logout',
  'signup',
  
  // Errors
  'error',
  
  // Client portal
  'portal_login',
  'feedback_submitted',
  'beat_trainer',
]);

/**
 * Sampling rates by event name pattern
 * Value is the percentage of events to track (0-100)
 */
const SAMPLING_RATES: Record<string, number> = {
  // Navigation events - sample 10%
  'page_view': 10,
  'page_leave': 10,
  
  // UI interactions - sample 25%
  'button_click': 25,
  'tab_change': 25,
  'modal_open': 25,
  'modal_close': 25,
  
  // Search - sample 50%
  'search': 50,
  'filter_applied': 50,
  
  // Default for unknown events
  'default': 100,
};

/**
 * Check if an event is critical (never sampled)
 */
export function isCriticalEvent(eventName: string): boolean {
  // Check exact match
  if (CRITICAL_EVENTS.has(eventName)) {
    return true;
  }
  
  // Check if event starts with any critical prefix
  const criticalPrefixes = ['credit_', 'payment_', 'training_', 'badge_', 'error_'];
  return criticalPrefixes.some(prefix => eventName.startsWith(prefix));
}

/**
 * Get sampling rate for an event (0-100)
 */
export function getSamplingRate(eventName: string): number {
  // Critical events always 100%
  if (isCriticalEvent(eventName)) {
    return 100;
  }
  
  // Check exact match
  if (eventName in SAMPLING_RATES) {
    return SAMPLING_RATES[eventName];
  }
  
  // Check prefix match
  for (const [pattern, rate] of Object.entries(SAMPLING_RATES)) {
    if (eventName.startsWith(pattern)) {
      return rate;
    }
  }
  
  return SAMPLING_RATES.default;
}

/**
 * Determine if event should be tracked based on sampling
 * Uses consistent hashing for reproducible sampling
 */
export function shouldSampleEvent(eventName: string, eventId?: string): boolean {
  const rate = getSamplingRate(eventName);
  
  // 100% = always track
  if (rate >= 100) {
    return true;
  }
  
  // 0% = never track
  if (rate <= 0) {
    return false;
  }
  
  // Use simple random for sampling (consistent per session for debugging)
  // In production, could use eventId hash for reproducibility
  const random = eventId 
    ? hashString(eventId) % 100
    : Math.random() * 100;
  
  return random < rate;
}

/**
 * Simple string hash for consistent sampling
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Get sampling statistics (for debugging)
 */
export function getSamplingConfig(): { critical: string[]; rates: Record<string, number> } {
  return {
    critical: Array.from(CRITICAL_EVENTS),
    rates: { ...SAMPLING_RATES },
  };
}
