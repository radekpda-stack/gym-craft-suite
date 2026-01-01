/**
 * Analytics Tracker - Single Source of Truth
 * 
 * All analytics events flow through this module.
 * Handles deduplication, enrichment, and queuing.
 */

import { supabase } from '@/integrations/supabase/client';
import type { AnalyticsEvent, EventCategory, TrackOptions, ErrorCode } from './types';
import { generateEventId, createDedupKey, checkDedup, markEventSent } from './dedup';
import { enrichMetadata, getSessionId, updateSessionActivity, updateReferrerRoute } from './enrichment';
import { enqueueEvent, setDebugMode, isDebugMode, getDebugLog, clearDebugLog, getQueueStatus } from './queue';
import { 
  startPageTracking, 
  endPageTracking, 
  getCurrentPageState, 
  getCurrentPageName 
} from './visibility';

// Re-export types
export type { EventCategory, TrackOptions, ErrorCode, AnalyticsEvent };

/**
 * Main tracking function
 */
export async function track(
  eventName: string,
  category: EventCategory,
  options: TrackOptions = {}
): Promise<void> {
  const {
    metadata = {},
    duration_ms,
    active_duration_ms,
    visibility_interruptions,
    success = true,
    error_message,
    error_code,
    entity_type,
    entity_id,
    debounceMs = 500,
    skipDedup = false
  } = options;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const route = window.location.pathname;
    const dedupKey = createDedupKey(eventName, category, route, entity_id);
    
    // Check deduplication
    if (!skipDedup) {
      const existingEventId = checkDedup(dedupKey, debounceMs);
      if (existingEventId) {
        if (import.meta.env.DEV) {
          console.debug(`[Analytics] Deduped event: ${eventName}`);
        }
        return;
      }
    }
    
    // Generate event ID
    const eventId = generateEventId();
    
    // Get session
    const sessionId = await getSessionId();
    
    // Build event
    const event: AnalyticsEvent = {
      event_id: eventId,
      event_name: eventName,
      category,
      timestamp: new Date().toISOString(),
      user_id: user.id,
      session_id: sessionId || undefined,
      duration_ms,
      active_duration_ms,
      visibility_interruptions,
      success,
      error_message,
      error_code,
      entity_type,
      entity_id,
      metadata: enrichMetadata(metadata)
    };
    
    // Mark as sent (for dedup)
    markEventSent(dedupKey, eventId);
    
    // Enqueue for batch processing
    enqueueEvent(event);
    
    // Update session activity
    updateSessionActivity();
    
  } catch (error) {
    if (import.meta.env.DEV) {
      console.debug('[Analytics] Tracking failed:', error);
    }
  }
}

/**
 * Track page view with visibility-aware duration
 */
export async function trackPageView(pageName: string): Promise<void> {
  // End previous page tracking
  const previousPage = endPageTracking();
  
  if (previousPage && previousPage.activeTime > 500) {
    // Track page leave with active duration
    await track(`page_leave`, 'navigation', {
      metadata: {
        page_name: previousPage.pageName
      },
      duration_ms: Date.now() - previousPage.startTime,
      active_duration_ms: previousPage.activeTime,
      visibility_interruptions: previousPage.visibilityInterruptions,
      skipDedup: true // Always track page leaves
    });
  }
  
  // Update referrer
  if (previousPage) {
    updateReferrerRoute(window.location.pathname);
  }
  
  // Start new page tracking
  startPageTracking(pageName);
  
  // Track page view
  await track(`page_view`, 'navigation', {
    metadata: {
      page_name: pageName
    }
  });
}

/**
 * Track action with timing helper
 */
export function startTimedAction(
  actionName: string,
  category: EventCategory,
  metadata?: Record<string, any>
) {
  const startTime = Date.now();
  
  return {
    success: async (additionalMetadata?: Record<string, any>) => {
      await track(actionName, category, {
        metadata: { ...metadata, ...additionalMetadata },
        duration_ms: Date.now() - startTime,
        success: true,
        skipDedup: true
      });
    },
    error: async (
      errorMessage: string, 
      errorCode: ErrorCode = 'UNKNOWN',
      additionalMetadata?: Record<string, any>
    ) => {
      await track(actionName, category, {
        metadata: { ...metadata, ...additionalMetadata },
        duration_ms: Date.now() - startTime,
        success: false,
        error_message: errorMessage,
        error_code: errorCode,
        skipDedup: true
      });
    }
  };
}

/**
 * Track error event
 */
export async function trackError(
  operation: string,
  category: EventCategory,
  error: Error | string,
  errorCode: ErrorCode = 'UNKNOWN',
  metadata?: Record<string, any>
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : error;
  
  await track(`error_${operation}`, category, {
    metadata: {
      ...metadata,
      error_name: error instanceof Error ? error.name : 'Error'
    },
    success: false,
    error_message: errorMessage.substring(0, 500),
    error_code: errorCode,
    skipDedup: true
  });
}

/**
 * Track metric/PR detection
 */
export async function trackMetric(
  metricName: string,
  category: EventCategory,
  value: number,
  metadata?: Record<string, any>
): Promise<void> {
  await track(`metric_${metricName}`, category, {
    metadata: {
      ...metadata,
      metric_value: value
    }
  });
}

/**
 * End current page view (call on unmount/navigation)
 */
export function endCurrentPageView(): void {
  const pageState = endPageTracking();
  
  if (pageState && pageState.activeTime > 500) {
    track(`page_leave`, 'navigation', {
      metadata: {
        page_name: pageState.pageName
      },
      duration_ms: Date.now() - pageState.startTime,
      active_duration_ms: pageState.activeTime,
      visibility_interruptions: pageState.visibilityInterruptions,
      skipDedup: true
    }).catch(() => {});
  }
}

/**
 * Get page name from route
 */
export function getPageNameFromRoute(pathname: string): string {
  const parts = pathname.slice(1).split('/');
  
  const routeMap: Record<string, string> = {
    '': 'dashboard',
    'clients': 'clients',
    'calendar': 'calendar',
    'trainings': 'trainings',
    'exercises': 'exercises',
    'plans': 'plans',
    'finance': 'finance',
    'sales': 'sales',
    'feedback': 'feedback',
    'settings': 'settings',
    'demo': 'demo',
    'login': 'login',
    'signup': 'signup',
    'records': 'records'
  };

  if (parts[0] === 'clients' && parts[1]) return 'client_detail';
  if (parts[0] === 'training' && parts[1]) return 'training_detail';
  if (parts[0] === 'feedback' && parts[1]) return 'feedback_form';

  return routeMap[parts[0]] || parts[0] || 'unknown';
}

// Debug API
export const debug = {
  setEnabled: setDebugMode,
  isEnabled: isDebugMode,
  getLog: getDebugLog,
  clearLog: clearDebugLog,
  getQueueStatus,
  getCurrentPage: getCurrentPageName,
  getPageState: getCurrentPageState
};

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).__analytics = debug;
}
