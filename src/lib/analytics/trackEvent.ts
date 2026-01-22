import { supabase } from '@/integrations/supabase/client';
import { sessionManager, getDeviceType, getOS } from './SessionManager';

export const EVENT_SCHEMA_VERSION = '1.0';

export type EventCategory = 
  | 'navigation'
  | 'calendar'
  | 'clients'
  | 'trainings'
  | 'plans'
  | 'measurements'
  | 'diagnostics'
  | 'finance'
  | 'media'
  | 'search'
  | 'ai'
  | 'feedback'
  | 'nutrition'
  | 'progress'
  | 'settings'
  | 'export'
  | 'reminders'
  | 'system'
  | 'challenges'
  | 'exercises'
  | 'gamification'
  | 'client-portal'
  | 'pre-diagnostic'
  | 'performance'
  | 'errors'
  | 'calendar-import';

export interface TrackEventOptions {
  metadata?: Record<string, any>;
  duration_ms?: number;
  success?: boolean;
  error_message?: string;
  debounceMs?: number;
}

// Global debounce map
const lastTracked = new Map<string, number>();

// Get current route
function getCurrentRoute(): string {
  return window.location.pathname;
}

// Get referrer route from session storage
let previousRoute: string | null = null;

export function updateReferrerRoute(newRoute: string): void {
  previousRoute = newRoute;
}

export function getReferrerRoute(): string | null {
  return previousRoute;
}

// Environment detection
function getEnvironment(): 'prod' | 'demo' | 'dev' {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'dev';
  if (hostname.includes('demo') || window.location.search.includes('demo=true')) return 'demo';
  return 'prod';
}

/**
 * Main event tracking function with consistent structure
 */
export async function trackEvent(
  eventName: string,
  category: EventCategory,
  options: TrackEventOptions = {}
): Promise<void> {
  const { 
    metadata = {}, 
    duration_ms, 
    success = true, 
    error_message,
    debounceMs = 500 
  } = options;

  // Debounce check
  const dedupeKey = `${eventName}-${category}-${getCurrentRoute()}`;
  const now = Date.now();
  const lastTime = lastTracked.get(dedupeKey) || 0;
  
  if (now - lastTime < debounceMs) {
    return;
  }
  lastTracked.set(dedupeKey, now);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Wait for session if not ready
    const sessionId = sessionManager.getSessionId() || await sessionManager.waitForSession();
    
    // Validate required fields in dev
    if (import.meta.env.DEV && !sessionId) {
      console.error(`[Analytics] Missing session_id for event: ${eventName}`);
    }

    // Build enriched metadata
    const enrichedMetadata = {
      ...metadata,
      event_schema_version: EVENT_SCHEMA_VERSION,
      route: getCurrentRoute(),
      referrer_route: getReferrerRoute(),
      device_type: getDeviceType(),
      platform_os: getOS(),
      environment: getEnvironment(),
      timestamp: new Date().toISOString(),
    };

    await supabase.from('feature_usage').insert({
      user_id: user.id,
      feature_name: eventName,
      feature_category: category,
      metadata: enrichedMetadata,
      session_id: sessionId,
      duration_ms: duration_ms || null,
      success,
      error_message: error_message || null,
    });

    // Update session activity
    sessionManager.updateActivity();
  } catch (error) {
    // Silently fail - don't break the app for analytics
    if (import.meta.env.DEV) {
      console.debug('[Analytics] Event tracking failed:', error);
    }
  }
}

/**
 * Track with timing - returns functions to call on success/error
 */
export function startTimedEvent(
  eventName: string,
  category: EventCategory,
  metadata?: Record<string, any>
) {
  const startTime = Date.now();
  
  return {
    success: async (additionalMetadata?: Record<string, any>) => {
      const duration = Date.now() - startTime;
      await trackEvent(eventName, category, {
        metadata: { ...metadata, ...additionalMetadata },
        duration_ms: duration,
        success: true,
        debounceMs: 0 // No debounce for timed events
      });
    },
    error: async (errorMessage: string, additionalMetadata?: Record<string, any>) => {
      const duration = Date.now() - startTime;
      await trackEvent(eventName, category, {
        metadata: { ...metadata, ...additionalMetadata },
        duration_ms: duration,
        success: false,
        error_message: errorMessage,
        debounceMs: 0
      });
    }
  };
}

// Re-export EventCategory as FeatureCategory for backwards compatibility
export type FeatureCategory = EventCategory;
